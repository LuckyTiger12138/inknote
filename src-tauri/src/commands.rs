use crate::db::{DbError, Database};
use crate::io::{self, TransferResult};
use crate::models::{
    AppBootstrap, AppSettings, CreateNoteInput, CreateNotebookInput, Note, NoteFilter, Notebook,
    TagCount, UpdateNoteInput,
};
use crate::paths::{self, DataPaths};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct DbState {
    pub db: Mutex<Database>,
    pub db_path: PathBuf,
    pub data_dir: PathBuf,
    pub portable: bool,
    pub mode: String,
}

fn map_err(err: DbError) -> String {
    err.to_string()
}

fn map_io(err: io::IoError) -> String {
    err.to_string()
}

#[tauri::command]
pub fn bootstrap(state: State<'_, DbState>) -> Result<AppBootstrap, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .bootstrap()
        .map_err(map_err)
}

#[tauri::command]
pub fn list_notes(state: State<'_, DbState>, filter: NoteFilter) -> Result<Vec<Note>, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .list_notes(&filter)
        .map_err(map_err)
}

#[tauri::command]
pub fn get_note(state: State<'_, DbState>, id: String) -> Result<Note, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .get_note(&id)
        .map_err(map_err)
}

#[tauri::command]
pub fn create_note(state: State<'_, DbState>, input: CreateNoteInput) -> Result<Note, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .create_note(input)
        .map_err(map_err)
}

#[tauri::command]
pub fn update_note(state: State<'_, DbState>, input: UpdateNoteInput) -> Result<Note, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .update_note(input)
        .map_err(map_err)
}

#[tauri::command]
pub fn soft_delete_note(state: State<'_, DbState>, id: String) -> Result<Note, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .soft_delete_note(&id)
        .map_err(map_err)
}

#[tauri::command]
pub fn restore_note(state: State<'_, DbState>, id: String) -> Result<Note, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .restore_note(&id)
        .map_err(map_err)
}

#[tauri::command]
pub fn permanent_delete_note(state: State<'_, DbState>, id: String) -> Result<(), String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .permanent_delete_note(&id)
        .map_err(map_err)
}

#[tauri::command]
pub fn empty_trash(state: State<'_, DbState>) -> Result<i64, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .empty_trash()
        .map_err(map_err)
}

#[tauri::command]
pub fn list_notebooks(state: State<'_, DbState>) -> Result<Vec<Notebook>, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .list_notebooks()
        .map_err(map_err)
}

#[tauri::command]
pub fn create_notebook(
    state: State<'_, DbState>,
    input: CreateNotebookInput,
) -> Result<Notebook, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .create_notebook(input)
        .map_err(map_err)
}

#[tauri::command]
pub fn rename_notebook(
    state: State<'_, DbState>,
    id: String,
    name: String,
) -> Result<Notebook, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .rename_notebook(&id, &name)
        .map_err(map_err)
}

#[tauri::command]
pub fn delete_notebook(state: State<'_, DbState>, id: String) -> Result<(), String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .delete_notebook(&id)
        .map_err(map_err)
}

#[tauri::command]
pub fn list_tags(state: State<'_, DbState>) -> Result<Vec<TagCount>, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .list_tags()
        .map_err(map_err)
}

#[tauri::command]
pub fn get_settings(state: State<'_, DbState>) -> Result<AppSettings, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .get_settings()
        .map_err(map_err)
}

#[tauri::command]
pub fn save_settings(
    state: State<'_, DbState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .save_settings(&settings)
        .map_err(map_err)
}

#[tauri::command]
pub fn get_db_path(state: State<'_, DbState>) -> Result<String, String> {
    Ok(state.db_path.to_string_lossy().into())
}

#[tauri::command]
pub fn get_data_paths(state: State<'_, DbState>) -> Result<DataPaths, String> {
    Ok(paths::to_info(
        &state.data_dir,
        &state.db_path,
        state.portable,
        &state.mode,
    ))
}

#[tauri::command]
pub fn get_app_info(state: State<'_, DbState>) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "name": "InkNote",
        "version": env!("CARGO_PKG_VERSION"),
        "portable": state.portable,
        "mode": state.mode,
        "dbPath": state.db_path.to_string_lossy(),
        "dataDir": state.data_dir.to_string_lossy(),
    }))
}

#[tauri::command]
pub fn export_markdown(state: State<'_, DbState>, dir: String) -> Result<TransferResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    io::export_notes_markdown(&db, PathBuf::from(dir).as_path()).map_err(map_io)
}

#[tauri::command]
pub fn import_markdown(state: State<'_, DbState>, dir: String) -> Result<TransferResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    io::import_notes_markdown(&db, PathBuf::from(dir).as_path()).map_err(map_io)
}

#[tauri::command]
pub fn backup_database(state: State<'_, DbState>, dest: String) -> Result<TransferResult, String> {
    // Drop lock before copy? Keep lock to reduce writes mid-copy.
    let _guard = state.db.lock().map_err(|e| e.to_string())?;
    io::backup_database(&state.db_path, PathBuf::from(dest).as_path()).map_err(map_io)
}

#[tauri::command]
pub fn restore_database(state: State<'_, DbState>, src: String) -> Result<TransferResult, String> {
    // Close logical access: hold lock, restore file. App should restart after.
    let _guard = state.db.lock().map_err(|e| e.to_string())?;
    io::restore_database(&state.db_path, PathBuf::from(src).as_path()).map_err(map_io)
}

#[tauri::command]
pub fn enable_portable_mode(app: AppHandle) -> Result<DataPaths, String> {
    paths::enable_portable_near_exe(&app)
}

#[tauri::command]
pub fn open_data_dir(state: State<'_, DbState>) -> Result<(), String> {
    let path = state.data_dir.clone();
    open::that(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn tray_show_main(app: AppHandle) -> Result<(), String> {
    crate::tray::hide_tray_menu(&app).ok();
    crate::tray::show_main(&app);
    Ok(())
}

#[tauri::command]
pub fn tray_quit_app(app: AppHandle) -> Result<(), String> {
    crate::tray::request_quit(&app);
    Ok(())
}

#[tauri::command]
pub fn tray_hide_menu(app: AppHandle) -> Result<(), String> {
    crate::tray::hide_tray_menu(&app).map_err(|e| e.to_string())
}

pub fn init_database(app: &AppHandle) -> Result<DbState, String> {
    let (data_dir, db_path, portable, mode) = paths::resolve_data_paths(app)?;
    let db = Database::open(&db_path).map_err(|e| e.to_string())?;
    Ok(DbState {
        db: Mutex::new(db),
        db_path,
        data_dir,
        portable,
        mode,
    })
}
