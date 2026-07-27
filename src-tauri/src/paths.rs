use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataPaths {
    pub data_dir: String,
    pub db_path: String,
    pub portable: bool,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct PathConfig {
    data_dir: Option<String>,
}

pub fn resolve_data_paths(app: &AppHandle) -> Result<(PathBuf, PathBuf, bool, String), String> {
    if let Ok(custom) = std::env::var("INKNOTE_DATA_DIR") {
        let dir = PathBuf::from(custom);
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let db = dir.join("inknote.db");
        return Ok((dir, db, true, "env".into()));
    }

    let exe_dir = app
        .path()
        .resource_dir()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .or_else(|| {
            std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        });

    if let Some(ref base) = exe_dir {
        let portable_flag = base.join("portable.flag");
        let portable_data = base.join("data");
        if portable_flag.exists() || portable_data.exists() {
            let dir = if portable_data.exists() {
                portable_data
            } else {
                base.join("data")
            };
            fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            let db = dir.join("inknote.db");
            return Ok((dir, db, true, "portable".into()));
        }

        // Optional path override next to exe
        let cfg_path = base.join("inknote-path.json");
        if cfg_path.exists() {
            if let Ok(text) = fs::read_to_string(&cfg_path) {
                if let Ok(cfg) = serde_json::from_str::<PathConfig>(&text) {
                    if let Some(dir_s) = cfg.data_dir {
                        let dir = PathBuf::from(dir_s);
                        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
                        let db = dir.join("inknote.db");
                        return Ok((dir, db, false, "config".into()));
                    }
                }
            }
        }
    }

    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let db = dir.join("inknote.db");
    Ok((dir, db, false, "appdata".into()))
}

pub fn enable_portable_near_exe(app: &AppHandle) -> Result<DataPaths, String> {
    let base = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or_else(|| "cannot resolve exe dir".to_string())?
        .to_path_buf();
    fs::write(base.join("portable.flag"), b"1").map_err(|e| e.to_string())?;
    let dir = base.join("data");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    // Copy existing db if present in appdata and portable is empty
    if let Ok(appdata) = app.path().app_data_dir() {
        let src = appdata.join("inknote.db");
        let dst = dir.join("inknote.db");
        if src.exists() && !dst.exists() {
            let _ = fs::copy(&src, &dst);
        }
    }
    Ok(DataPaths {
        data_dir: dir.to_string_lossy().into(),
        db_path: dir.join("inknote.db").to_string_lossy().into(),
        portable: true,
        mode: "portable".into(),
    })
}

pub fn to_info(data_dir: &Path, db_path: &Path, portable: bool, mode: &str) -> DataPaths {
    DataPaths {
        data_dir: data_dir.to_string_lossy().into(),
        db_path: db_path.to_string_lossy().into(),
        portable,
        mode: mode.into(),
    }
}
