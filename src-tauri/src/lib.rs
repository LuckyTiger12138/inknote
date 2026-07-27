mod commands;
mod db;
mod io;
mod models;
mod paths;
mod tray;

use commands::{
    backup_database, bootstrap, create_note, create_notebook, delete_notebook, empty_trash,
    enable_portable_mode, export_markdown, get_app_info, get_data_paths, get_db_path, get_note,
    get_settings, import_markdown, init_database, list_notebooks, list_notes, list_tags,
    open_data_dir, permanent_delete_note, rename_notebook, restore_database, restore_note,
    save_settings, soft_delete_note, tray_hide_menu, tray_quit_app, tray_show_main, update_note,
};
use tauri::{Manager, RunEvent, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let state = init_database(app.handle())?;
            app.manage(state);
            tray::setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // X button: hide to tray, keep process alive
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            bootstrap,
            list_notes,
            get_note,
            create_note,
            update_note,
            soft_delete_note,
            restore_note,
            permanent_delete_note,
            empty_trash,
            list_notebooks,
            create_notebook,
            rename_notebook,
            delete_notebook,
            list_tags,
            get_settings,
            save_settings,
            get_db_path,
            get_data_paths,
            get_app_info,
            export_markdown,
            import_markdown,
            backup_database,
            restore_database,
            enable_portable_mode,
            open_data_dir,
            tray_show_main,
            tray_quit_app,
            tray_hide_menu
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let RunEvent::ExitRequested { api, .. } = event {
                // Keep running in tray unless user chose Quit
                if tray::should_prevent_exit() {
                    api.prevent_exit();
                }
            }
        });
}
