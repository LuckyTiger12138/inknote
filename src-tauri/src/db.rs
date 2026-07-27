use crate::models::{
    AppBootstrap, AppSettings, CreateNoteInput, CreateNotebookInput, Note, NoteFilter, Notebook,
    TagCount, UpdateNoteInput,
};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("sqlite: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("invalid: {0}")]
    Invalid(String),
}

pub type DbResult<T> = Result<T, DbError>;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open(path: &Path) -> DbResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| DbError::Invalid(e.to_string()))?;
        }
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            ",
        )?;
        let db = Self { conn };
        db.migrate()?;
        db.seed_if_empty()?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn open_in_memory() -> DbResult<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        let db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> DbResult<()> {
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS notebooks (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              parent_id TEXT,
              sort_order INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS notes (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              content TEXT NOT NULL DEFAULT '',
              notebook_id TEXT,
              is_pinned INTEGER NOT NULL DEFAULT 0,
              is_favorite INTEGER NOT NULL DEFAULT 0,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL,
              deleted_at INTEGER,
              FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS note_tags (
              note_id TEXT NOT NULL,
              tag TEXT NOT NULL,
              PRIMARY KEY (note_id, tag),
              FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
              note_id UNINDEXED,
              title,
              content,
              tags,
              tokenize = 'unicode61'
            );

            CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);
            CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag);
            "#,
        )?;
        Ok(())
    }

    fn seed_if_empty(&self) -> DbResult<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM notes", [], |r| r.get(0))?;
        if count > 0 {
            return Ok(());
        }

        let now = now_ms();
        self.conn.execute(
            "INSERT INTO notebooks (id, name, parent_id, sort_order) VALUES (?1, ?2, NULL, 0), (?3, ?4, NULL, 1)",
            params!["work", "工作", "life", "生活"],
        )?;

        let samples: Vec<(&str, &str, &str, Vec<String>, bool, bool)> = vec![
            (
                "项目周报 · 第 12 周",
                "# 项目周报 · 第 12 周\n\n本周聚焦本地笔记 MVP：三栏布局、自动保存与检索。原则是 **本地优先、启动要快、界面安静**。\n\n## 进展\n\n- [x] 完成主界面信息架构与设计 token\n- [x] 确定 Markdown 源码 + 预览方案\n- [x] 接入 SQLite 与笔记 CRUD\n- [ ] Windows 安装包与便携模式\n\n## 设计要点\n\n> 写作区保持冷静。强调色只用于选中、链接与焦点。\n\n```js\nnote.save({ debounceMs: 1000 })\nsearch.query(text, { preferTitle: true })\n```\n",
                "work",
                vec!["工作".into(), "计划".into()],
                true,
                true,
            ),
            (
                "快捷键草案",
                "# 快捷键草案\n\n- `Ctrl+N` 新建笔记\n- `Ctrl+S` 保存\n- `Ctrl+K` 命令面板\n- `Ctrl+/` 编辑 / 预览 / 分栏循环\n",
                "work",
                vec!["产品".into()],
                false,
                false,
            ),
            (
                "读书摘录 · 深度工作",
                "# 读书摘录 · 深度工作\n\n注意力是稀缺资源。把工具变简单，把思考变深。\n\n> 深度工作是在无干扰状态下专注进行职业活动。\n",
                "life",
                vec!["生活".into(), "阅读".into()],
                false,
                true,
            ),
            (
                "SQLite FTS5 笔记",
                "# SQLite FTS5 笔记\n\n- 标题加权检索\n- 正文次之\n- 软删除：`deleted_at`\n- 可导出 Markdown + frontmatter\n",
                "work",
                vec!["技术".into()],
                false,
                false,
            ),
            (
                "UI Token 清单",
                "# UI Token 清单\n\n| Token | Dark |\n|-------|------|\n| bg-app | `#0F1115` |\n| accent | `#5B8DEF` |\n\n圆角 ≤ 8px，动效 150–250ms。\n",
                "work",
                vec!["设计".into()],
                false,
                false,
            ),
        ];

        for (i, (title, content, notebook, tags, pinned, favorite)) in samples.iter().enumerate() {
            let id = Uuid::new_v4().to_string();
            let updated = now - (i as i64) * 3_600_000;
            self.conn.execute(
                "INSERT INTO notes (id, title, content, notebook_id, is_pinned, is_favorite, created_at, updated_at, deleted_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL)",
                params![
                    id,
                    title,
                    content,
                    notebook,
                    if *pinned { 1 } else { 0 },
                    if *favorite { 1 } else { 0 },
                    updated - 86_400_000,
                    updated
                ],
            )?;
            self.replace_tags(&id, tags)?;
            self.upsert_fts(&id, title, content, tags)?;
        }

        let defaults = AppSettings::default();
        self.save_settings(&defaults)?;
        Ok(())
    }

    pub fn bootstrap(&self) -> DbResult<AppBootstrap> {
        Ok(AppBootstrap {
            notes: self.list_notes(&NoteFilter::default())?,
            notebooks: self.list_notebooks()?,
            tags: self.list_tags()?,
            settings: self.get_settings()?,
        })
    }

    pub fn list_notes(&self, filter: &NoteFilter) -> DbResult<Vec<Note>> {
        if let Some(query) = filter.query.as_ref().map(|q| q.trim()).filter(|q| !q.is_empty()) {
            return self.search_notes(query, filter);
        }

        let mut sql = String::from(
            "SELECT id, title, content, notebook_id, is_pinned, is_favorite, created_at, updated_at, deleted_at
             FROM notes WHERE 1=1",
        );
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if filter.trash_only {
            sql.push_str(" AND deleted_at IS NOT NULL");
        } else {
            sql.push_str(" AND deleted_at IS NULL");
        }

        if filter.favorites_only {
            sql.push_str(" AND is_favorite = 1");
        }

        if filter.ungrouped_only {
            sql.push_str(" AND notebook_id IS NULL");
        } else if let Some(notebook_id) = &filter.notebook_id {
            sql.push_str(" AND notebook_id = ?");
            values.push(Box::new(notebook_id.clone()));
        }

        if let Some(tag) = &filter.tag {
            sql.push_str(
                " AND id IN (SELECT note_id FROM note_tags WHERE tag = ?)",
            );
            values.push(Box::new(tag.clone()));
        }

        sql.push_str(" ORDER BY is_pinned DESC, updated_at DESC");

        let mut stmt = self.conn.prepare(&sql)?;
        let params_ref: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        let rows = stmt.query_map(params_ref.as_slice(), |row| self.map_note_row(row))?;
        let mut notes = Vec::new();
        for row in rows {
            let mut note = row?;
            note.tags = self.get_tags(&note.id)?;
            note.preview = make_preview(&note.content);
            notes.push(note);
        }
        Ok(notes)
    }

    fn search_notes(&self, query: &str, filter: &NoteFilter) -> DbResult<Vec<Note>> {
        let fts_query = build_fts_query(query);
        let mut sql = String::from(
            "SELECT n.id, n.title, n.content, n.notebook_id, n.is_pinned, n.is_favorite,
                    n.created_at, n.updated_at, n.deleted_at,
                    bm25(notes_fts) AS rank
             FROM notes_fts
             JOIN notes n ON n.id = notes_fts.note_id
             WHERE notes_fts MATCH ?",
        );
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        values.push(Box::new(fts_query));

        if filter.trash_only {
            sql.push_str(" AND n.deleted_at IS NOT NULL");
        } else {
            sql.push_str(" AND n.deleted_at IS NULL");
        }
        if filter.favorites_only {
            sql.push_str(" AND n.is_favorite = 1");
        }
        if filter.ungrouped_only {
            sql.push_str(" AND n.notebook_id IS NULL");
        } else if let Some(notebook_id) = &filter.notebook_id {
            sql.push_str(" AND n.notebook_id = ?");
            values.push(Box::new(notebook_id.clone()));
        }
        if let Some(tag) = &filter.tag {
            sql.push_str(" AND n.id IN (SELECT note_id FROM note_tags WHERE tag = ?)");
            values.push(Box::new(tag.clone()));
        }
        sql.push_str(" ORDER BY rank, n.is_pinned DESC, n.updated_at DESC");

        let mut stmt = self.conn.prepare(&sql)?;
        let params_ref: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok((
                Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    preview: String::new(),
                    tags: Vec::new(),
                    notebook_id: row.get(3)?,
                    is_pinned: row.get::<_, i64>(4)? != 0,
                    is_favorite: row.get::<_, i64>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    deleted_at: row.get(8)?,
                },
                row.get::<_, f64>(9)?,
            ))
        })?;

        let mut notes = Vec::new();
        for row in rows {
            let (mut note, _rank) = row?;
            note.tags = self.get_tags(&note.id)?;
            note.preview = make_preview(&note.content);
            notes.push(note);
        }

        // Fallback substring if FTS returns nothing (e.g. short CJK without tokens)
        if notes.is_empty() {
            return self.fallback_search(query, filter);
        }
        Ok(notes)
    }

    fn fallback_search(&self, query: &str, filter: &NoteFilter) -> DbResult<Vec<Note>> {
        let mut all = self.list_notes(&NoteFilter {
            query: None,
            ..filter.clone()
        })?;
        let q = query.to_lowercase();
        all.retain(|n| {
            n.title.to_lowercase().contains(&q)
                || n.content.to_lowercase().contains(&q)
                || n.tags.iter().any(|t| t.to_lowercase().contains(&q))
        });
        Ok(all)
    }

    pub fn get_note(&self, id: &str) -> DbResult<Note> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, notebook_id, is_pinned, is_favorite, created_at, updated_at, deleted_at
             FROM notes WHERE id = ?1",
        )?;
        let mut note = stmt
            .query_row(params![id], |row| self.map_note_row(row))
            .optional()?
            .ok_or_else(|| DbError::NotFound(id.into()))?;
        note.tags = self.get_tags(id)?;
        note.preview = make_preview(&note.content);
        Ok(note)
    }

    pub fn create_note(&self, input: CreateNoteInput) -> DbResult<Note> {
        let id = Uuid::new_v4().to_string();
        let now = now_ms();
        let title = input
            .title
            .unwrap_or_else(|| "无标题".into())
            .trim()
            .to_string();
        let title = if title.is_empty() {
            "无标题".into()
        } else {
            title
        };
        let content = input
            .content
            .unwrap_or_else(|| format!("# {}\n\n", title));
        let tags = input.tags.unwrap_or_default();

        self.conn.execute(
            "INSERT INTO notes (id, title, content, notebook_id, is_pinned, is_favorite, created_at, updated_at, deleted_at)
             VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?5, NULL)",
            params![id, title, content, input.notebook_id, now],
        )?;
        self.replace_tags(&id, &tags)?;
        self.upsert_fts(&id, &title, &content, &tags)?;
        self.get_note(&id)
    }

    pub fn update_note(&self, input: UpdateNoteInput) -> DbResult<Note> {
        let existing = self.get_note(&input.id)?;
        let title = input.title.unwrap_or(existing.title);
        let content = input.content.unwrap_or(existing.content);
        let notebook_id = if input.clear_notebook.unwrap_or(false) {
            None
        } else if let Some(id) = input.notebook_id {
            Some(id)
        } else {
            existing.notebook_id
        };
        let is_pinned = input.is_pinned.unwrap_or(existing.is_pinned);
        let is_favorite = input.is_favorite.unwrap_or(existing.is_favorite);
        let tags = input.tags.unwrap_or(existing.tags);
        let now = now_ms();

        self.conn.execute(
            "UPDATE notes SET title = ?1, content = ?2, notebook_id = ?3, is_pinned = ?4, is_favorite = ?5, updated_at = ?6
             WHERE id = ?7",
            params![
                title,
                content,
                notebook_id,
                if is_pinned { 1 } else { 0 },
                if is_favorite { 1 } else { 0 },
                now,
                input.id
            ],
        )?;
        self.replace_tags(&input.id, &tags)?;
        self.upsert_fts(&input.id, &title, &content, &tags)?;
        self.get_note(&input.id)
    }

    pub fn soft_delete_note(&self, id: &str) -> DbResult<Note> {
        let now = now_ms();
        let changed = self.conn.execute(
            "UPDATE notes SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            params![now, id],
        )?;
        if changed == 0 {
            return Err(DbError::NotFound(id.into()));
        }
        self.get_note(id)
    }

    pub fn restore_note(&self, id: &str) -> DbResult<Note> {
        let now = now_ms();
        let changed = self.conn.execute(
            "UPDATE notes SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NOT NULL",
            params![now, id],
        )?;
        if changed == 0 {
            return Err(DbError::NotFound(id.into()));
        }
        self.get_note(id)
    }

    pub fn permanent_delete_note(&self, id: &str) -> DbResult<()> {
        self.conn
            .execute("DELETE FROM notes_fts WHERE note_id = ?1", params![id])?;
        self.conn
            .execute("DELETE FROM note_tags WHERE note_id = ?1", params![id])?;
        let changed = self
            .conn
            .execute("DELETE FROM notes WHERE id = ?1", params![id])?;
        if changed == 0 {
            return Err(DbError::NotFound(id.into()));
        }
        Ok(())
    }

    pub fn empty_trash(&self) -> DbResult<i64> {
        let ids: Vec<String> = {
            let mut stmt = self
                .conn
                .prepare("SELECT id FROM notes WHERE deleted_at IS NOT NULL")?;
            let rows = stmt.query_map([], |r| r.get(0))?;
            rows.collect::<Result<Vec<_>, _>>()?
        };
        for id in &ids {
            self.permanent_delete_note(id)?;
        }
        Ok(ids.len() as i64)
    }

    pub fn list_notebooks(&self) -> DbResult<Vec<Notebook>> {
        let mut stmt = self.conn.prepare(
            "SELECT nb.id, nb.name, nb.parent_id, nb.sort_order,
                    (SELECT COUNT(*) FROM notes n WHERE n.notebook_id = nb.id AND n.deleted_at IS NULL) AS cnt
             FROM notebooks nb
             ORDER BY nb.sort_order ASC, nb.name ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Notebook {
                id: row.get(0)?,
                name: row.get(1)?,
                parent_id: row.get(2)?,
                sort_order: row.get(3)?,
                count: row.get(4)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
    }

    pub fn create_notebook(&self, input: CreateNotebookInput) -> DbResult<Notebook> {
        let name = input.name.trim().to_string();
        if name.is_empty() {
            return Err(DbError::Invalid("notebook name required".into()));
        }
        let id = Uuid::new_v4().to_string();
        let sort: i64 = self
            .conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM notebooks",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);
        self.conn.execute(
            "INSERT INTO notebooks (id, name, parent_id, sort_order) VALUES (?1, ?2, ?3, ?4)",
            params![id, name, input.parent_id, sort],
        )?;
        Ok(Notebook {
            id,
            name,
            parent_id: input.parent_id,
            sort_order: sort,
            count: 0,
        })
    }

    pub fn rename_notebook(&self, id: &str, name: &str) -> DbResult<Notebook> {
        let name = name.trim();
        if name.is_empty() {
            return Err(DbError::Invalid("notebook name required".into()));
        }
        let changed = self
            .conn
            .execute("UPDATE notebooks SET name = ?1 WHERE id = ?2", params![name, id])?;
        if changed == 0 {
            return Err(DbError::NotFound(id.into()));
        }
        self.list_notebooks()?
            .into_iter()
            .find(|n| n.id == id)
            .ok_or_else(|| DbError::NotFound(id.into()))
    }

    pub fn delete_notebook(&self, id: &str) -> DbResult<()> {
        self.conn.execute(
            "UPDATE notes SET notebook_id = NULL WHERE notebook_id = ?1",
            params![id],
        )?;
        let changed = self
            .conn
            .execute("DELETE FROM notebooks WHERE id = ?1", params![id])?;
        if changed == 0 {
            return Err(DbError::NotFound(id.into()));
        }
        Ok(())
    }

    pub fn list_tags(&self) -> DbResult<Vec<TagCount>> {
        let mut stmt = self.conn.prepare(
            "SELECT t.tag, COUNT(*) as cnt
             FROM note_tags t
             JOIN notes n ON n.id = t.note_id
             WHERE n.deleted_at IS NULL
             GROUP BY t.tag
             ORDER BY cnt DESC, t.tag ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(TagCount {
                name: row.get(0)?,
                count: row.get(1)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
    }

    pub fn get_settings(&self) -> DbResult<AppSettings> {
        let mut settings = AppSettings::default();
        let mut stmt = self.conn.prepare("SELECT key, value FROM settings")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "theme" => settings.theme = value,
                "editor_font_size" => {
                    settings.editor_font_size = value.parse().unwrap_or(16);
                }
                "auto_save_ms" => {
                    settings.auto_save_ms = value.parse().unwrap_or(1000);
                }
                "preview_mode" => settings.preview_mode = value,
                _ => {}
            }
        }
        Ok(settings)
    }

    pub fn save_settings(&self, settings: &AppSettings) -> DbResult<AppSettings> {
        let pairs = [
            ("theme", settings.theme.clone()),
            ("editor_font_size", settings.editor_font_size.to_string()),
            ("auto_save_ms", settings.auto_save_ms.to_string()),
            ("preview_mode", settings.preview_mode.clone()),
        ];
        for (key, value) in pairs {
            self.conn.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            )?;
        }
        Ok(settings.clone())
    }

    fn map_note_row(&self, row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
        Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            preview: String::new(),
            tags: Vec::new(),
            notebook_id: row.get(3)?,
            is_pinned: row.get::<_, i64>(4)? != 0,
            is_favorite: row.get::<_, i64>(5)? != 0,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            deleted_at: row.get(8)?,
        })
    }

    fn get_tags(&self, note_id: &str) -> DbResult<Vec<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT tag FROM note_tags WHERE note_id = ?1 ORDER BY tag ASC")?;
        let rows = stmt.query_map(params![note_id], |row| row.get(0))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
    }

    fn replace_tags(&self, note_id: &str, tags: &[String]) -> DbResult<()> {
        self.conn
            .execute("DELETE FROM note_tags WHERE note_id = ?1", params![note_id])?;
        let mut unique = tags
            .iter()
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty())
            .collect::<Vec<_>>();
        unique.sort();
        unique.dedup();
        for tag in unique {
            self.conn.execute(
                "INSERT INTO note_tags (note_id, tag) VALUES (?1, ?2)",
                params![note_id, tag],
            )?;
        }
        Ok(())
    }

    fn upsert_fts(&self, id: &str, title: &str, content: &str, tags: &[String]) -> DbResult<()> {
        self.conn
            .execute("DELETE FROM notes_fts WHERE note_id = ?1", params![id])?;
        let tags_joined = tags.join(" ");
        self.conn.execute(
            "INSERT INTO notes_fts (note_id, title, content, tags) VALUES (?1, ?2, ?3, ?4)",
            params![id, title, content, tags_joined],
        )?;
        Ok(())
    }
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn make_preview(content: &str) -> String {
    content
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .take(2)
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(80)
        .collect::<String>()
}

fn build_fts_query(raw: &str) -> String {
    raw.split_whitespace()
        .map(|part| {
            let cleaned = part.replace('"', "\"\"");
            format!("\"{}\"", cleaned)
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_update_search_and_trash() {
        let db = Database::open_in_memory().unwrap();
        let note = db
            .create_note(CreateNoteInput {
                title: Some("Hello SQLite".into()),
                content: Some("# Hello SQLite\n\nfull text search works".into()),
                notebook_id: None,
                tags: Some(vec!["tech".into()]),
            })
            .unwrap();

        assert_eq!(note.title, "Hello SQLite");
        assert!(note.tags.contains(&"tech".into()));

        let updated = db
            .update_note(UpdateNoteInput {
                id: note.id.clone(),
                title: Some("Hello FTS".into()),
                content: None,
                notebook_id: None,
                clear_notebook: None,
                tags: Some(vec!["tech".into(), "db".into()]),
                is_pinned: Some(true),
                is_favorite: None,
            })
            .unwrap();
        assert_eq!(updated.title, "Hello FTS");
        assert!(updated.is_pinned);

        let found = db
            .list_notes(&NoteFilter {
                query: Some("search".into()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(found.len(), 1);

        db.soft_delete_note(&note.id).unwrap();
        let active = db.list_notes(&NoteFilter::default()).unwrap();
        assert!(active.is_empty());
        let trash = db
            .list_notes(&NoteFilter {
                trash_only: true,
                ..Default::default()
            })
            .unwrap();
        assert_eq!(trash.len(), 1);

        db.restore_note(&note.id).unwrap();
        assert_eq!(db.list_notes(&NoteFilter::default()).unwrap().len(), 1);
    }

    #[test]
    fn preview_skips_heading() {
        assert_eq!(
            make_preview("# Title\n\nBody line here"),
            "Body line here"
        );
    }
}
