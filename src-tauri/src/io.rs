use crate::db::{DbError, Database};
use crate::models::{CreateNoteInput, CreateNotebookInput, Note, NoteFilter};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum IoError {
    #[error("{0}")]
    Msg(String),
    #[error(transparent)]
    Db(#[from] DbError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

pub type IoResult<T> = Result<T, IoError>;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferResult {
    pub exported: i64,
    pub imported: i64,
    pub path: String,
    pub message: String,
}

fn sanitize_filename(title: &str) -> String {
    let mut s: String = title
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();
    s = s.trim().trim_matches('.').to_string();
    if s.is_empty() {
        s = "untitled".into();
    }
    s.chars().take(60).collect()
}

fn notebook_name(db: &Database, id: Option<&str>) -> String {
    let Some(id) = id else {
        return "inbox".into();
    };
    db.list_notebooks()
        .ok()
        .and_then(|list| list.into_iter().find(|n| n.id == id).map(|n| n.name))
        .unwrap_or_else(|| "inbox".into())
}

fn notebook_id_by_name(db: &Database, name: &str) -> IoResult<Option<String>> {
    let list = db.list_notebooks()?;
    if let Some(found) = list.iter().find(|n| n.name == name) {
        return Ok(Some(found.id.clone()));
    }
    if name == "inbox" || name.is_empty() {
        return Ok(None);
    }
    let nb = db.create_notebook(CreateNotebookInput {
        name: name.to_string(),
        parent_id: None,
    })?;
    Ok(Some(nb.id))
}

fn render_markdown_file(note: &Note, notebook: &str) -> String {
    let tags = note
        .tags
        .iter()
        .map(|t| format!("\"{}\"", t.replace('"', "\\\"")))
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        r#"---
id: {}
title: "{}"
tags: [{}]
notebook: "{}"
pinned: {}
favorite: {}
created: {}
updated: {}
---

{}"#,
        note.id,
        note.title.replace('"', "\\\""),
        tags,
        notebook.replace('"', "\\\""),
        note.is_pinned,
        note.is_favorite,
        note.created_at,
        note.updated_at,
        note.content.trim_start()
    )
}

fn parse_frontmatter(raw: &str) -> (std::collections::HashMap<String, String>, String) {
    let mut meta = std::collections::HashMap::new();
    let trimmed = raw.trim_start_matches('\u{feff}');
    if !trimmed.starts_with("---") {
        return (meta, raw.to_string());
    }
    let rest = &trimmed[3..];
    let Some(end) = rest.find("\n---") else {
        return (meta, raw.to_string());
    };
    let yaml = &rest[..end];
    let body = rest[end + 4..].trim_start_matches('\r').trim_start_matches('\n');
    for line in yaml.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((k, v)) = line.split_once(':') {
            let key = k.trim().to_string();
            let mut val = v.trim().to_string();
            if val.starts_with('[') && val.ends_with(']') {
                // keep as-is for tags
            } else {
                val = val.trim_matches('"').trim_matches('\'').to_string();
            }
            meta.insert(key, val);
        }
    }
    (meta, body.to_string())
}

fn parse_tags_field(raw: &str) -> Vec<String> {
    let s = raw.trim();
    if s.starts_with('[') && s.ends_with(']') {
        s[1..s.len() - 1]
            .split(',')
            .map(|p| p.trim().trim_matches('"').trim_matches('\'').to_string())
            .filter(|p| !p.is_empty())
            .collect()
    } else if s.is_empty() {
        vec![]
    } else {
        s.split(|c| c == ',' || c == '，')
            .map(|p| p.trim().to_string())
            .filter(|p| !p.is_empty())
            .collect()
    }
}

pub fn export_notes_markdown(db: &Database, dir: &Path) -> IoResult<TransferResult> {
    fs::create_dir_all(dir)?;
    let notes = db.list_notes(&NoteFilter::default())?;
    let notebooks = db.list_notebooks()?;
    let manifest = serde_json::json!({
        "version": 1,
        "exportedAt": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0),
        "notebooks": notebooks.iter().map(|n| serde_json::json!({
            "id": n.id,
            "name": n.name,
        })).collect::<Vec<_>>(),
        "count": notes.len(),
    });
    fs::write(
        dir.join("_inknote_export.json"),
        serde_json::to_string_pretty(&manifest).unwrap_or_default(),
    )?;

    let mut count = 0i64;
    for note in &notes {
        let nb_name = notebook_name(db, note.notebook_id.as_deref());
        let nb_dir = dir.join(sanitize_filename(&nb_name));
        fs::create_dir_all(&nb_dir)?;
        let short = note.id.chars().take(8).collect::<String>();
        let filename = format!("{}__{}.md", sanitize_filename(&note.title), short);
        let path = nb_dir.join(filename);
        fs::write(&path, render_markdown_file(note, &nb_name))?;
        count += 1;
    }

    Ok(TransferResult {
        exported: count,
        imported: 0,
        path: dir.to_string_lossy().into(),
        message: format!("已导出 {} 篇笔记", count),
    })
}

pub fn import_notes_markdown(db: &Database, dir: &Path) -> IoResult<TransferResult> {
    if !dir.exists() {
        return Err(IoError::Msg("目录不存在".into()));
    }
    let mut imported = 0i64;
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        let entries = fs::read_dir(&current)?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }
            let raw = fs::read_to_string(&path)?;
            let (meta, body) = parse_frontmatter(&raw);
            let title = meta
                .get("title")
                .cloned()
                .unwrap_or_else(|| {
                    path.file_stem()
                        .map(|s| s.to_string_lossy().into_owned())
                        .unwrap_or_else(|| "导入笔记".into())
                });
            let tags = meta
                .get("tags")
                .map(|t| parse_tags_field(t))
                .unwrap_or_default();
            let notebook = meta.get("notebook").map(|s| s.as_str()).unwrap_or("inbox");
            let notebook_id = notebook_id_by_name(db, notebook)?;
            let content = if body.trim_start().starts_with('#') {
                body
            } else {
                format!("# {}\n\n{}", title, body)
            };

            // Upsert by id if present
            if let Some(id) = meta.get("id") {
                if db.get_note(id).is_ok() {
                    use crate::models::UpdateNoteInput;
                    db.update_note(UpdateNoteInput {
                        id: id.clone(),
                        title: Some(title),
                        content: Some(content),
                        notebook_id,
                        clear_notebook: Some(false),
                        tags: Some(tags),
                        is_pinned: meta.get("pinned").map(|v| v == "true"),
                        is_favorite: meta.get("favorite").map(|v| v == "true"),
                    })?;
                    imported += 1;
                    continue;
                }
            }

            let note = db.create_note(CreateNoteInput {
                title: Some(title),
                content: Some(content),
                notebook_id,
                tags: Some(tags),
            })?;
            if meta.get("pinned").map(|v| v == "true").unwrap_or(false)
                || meta.get("favorite").map(|v| v == "true").unwrap_or(false)
            {
                use crate::models::UpdateNoteInput;
                db.update_note(UpdateNoteInput {
                    id: note.id,
                    title: None,
                    content: None,
                    notebook_id: None,
                    clear_notebook: None,
                    tags: None,
                    is_pinned: meta.get("pinned").map(|v| v == "true"),
                    is_favorite: meta.get("favorite").map(|v| v == "true"),
                })?;
            }
            imported += 1;
        }
    }

    Ok(TransferResult {
        exported: 0,
        imported,
        path: dir.to_string_lossy().into(),
        message: format!("已导入 {} 篇笔记", imported),
    })
}

pub fn backup_database(db_path: &Path, dest: &Path) -> IoResult<TransferResult> {
    if !db_path.exists() {
        return Err(IoError::Msg("数据库文件不存在".into()));
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent)?;
    }
    // Ensure WAL checkpoint by opening briefly is handled by caller ideally;
    // plain copy is acceptable for local backup.
    fs::copy(db_path, dest)?;
    // Also copy -wal/-shm if present
    let wal = PathBuf::from(format!("{}-wal", db_path.display()));
    let shm = PathBuf::from(format!("{}-shm", db_path.display()));
    if wal.exists() {
        let _ = fs::copy(&wal, PathBuf::from(format!("{}-wal", dest.display())));
    }
    if shm.exists() {
        let _ = fs::copy(&shm, PathBuf::from(format!("{}-shm", dest.display())));
    }
    Ok(TransferResult {
        exported: 1,
        imported: 0,
        path: dest.to_string_lossy().into(),
        message: "数据库备份完成".into(),
    })
}

pub fn restore_database(db_path: &Path, src: &Path) -> IoResult<TransferResult> {
    if !src.exists() {
        return Err(IoError::Msg("备份文件不存在".into()));
    }
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)?;
    }
    // Remove wal/shm so restored db is clean
    let wal = PathBuf::from(format!("{}-wal", db_path.display()));
    let shm = PathBuf::from(format!("{}-shm", db_path.display()));
    let _ = fs::remove_file(&wal);
    let _ = fs::remove_file(&shm);
    fs::copy(src, db_path)?;
    Ok(TransferResult {
        exported: 0,
        imported: 1,
        path: db_path.to_string_lossy().into(),
        message: "数据库已从备份恢复，请重启应用".into(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    #[test]
    fn export_import_roundtrip() {
        let db = Database::open_in_memory().unwrap();
        db.create_note(CreateNoteInput {
            title: Some("导出测试".into()),
            content: Some("# 导出测试\n\nhello export".into()),
            notebook_id: None,
            tags: Some(vec!["t1".into()]),
        })
        .unwrap();

        let dir = std::env::temp_dir().join(format!("inknote-export-{}", uuid::Uuid::new_v4()));
        let _ = fs::remove_dir_all(&dir);
        let exported = export_notes_markdown(&db, &dir).unwrap();
        assert_eq!(exported.exported, 1);

        let db2 = Database::open_in_memory().unwrap();
        let imported = import_notes_markdown(&db2, &dir).unwrap();
        assert_eq!(imported.imported, 1);
        let notes = db2.list_notes(&NoteFilter::default()).unwrap();
        assert_eq!(notes[0].title, "导出测试");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn sanitize_removes_illegal() {
        assert!(!sanitize_filename("a/b:c*?").contains('/'));
    }
}
