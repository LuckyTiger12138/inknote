use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, Runtime, WebviewUrl, WebviewWindowBuilder,
};

/// When true, the next exit is allowed (user chose Quit from tray).
static ALLOW_EXIT: AtomicBool = AtomicBool::new(false);

const TRAY_MENU_LABEL: &str = "tray-menu";

pub fn request_quit<R: Runtime>(app: &AppHandle<R>) {
    ALLOW_EXIT.store(true, Ordering::SeqCst);
    // Close tray menu if open
    let _ = hide_tray_menu(app);
    app.exit(0);
}

pub fn should_prevent_exit() -> bool {
    !ALLOW_EXIT.load(Ordering::SeqCst)
}

pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let mut builder = TrayIconBuilder::with_id("inknote-tray")
        .tooltip("InkNote — 本地笔记\n左键显示窗口 · 右键打开菜单")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            let app = tray.app_handle();
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
                | TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                } => {
                    let _ = hide_tray_menu(app);
                    show_main(app);
                }
                TrayIconEvent::Click {
                    button: MouseButton::Right,
                    button_state: MouseButtonState::Up,
                    position,
                    ..
                } => {
                    let _ = show_tray_menu(app, position);
                }
                _ => {}
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    // Keep tray alive for process lifetime
    let tray = builder.build(app)?;
    app.manage(tray);
    Ok(())
}

pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

fn show_tray_menu<R: Runtime>(
    app: &AppHandle<R>,
    position: PhysicalPosition<f64>,
) -> tauri::Result<()> {
    // Reuse existing menu window if present
    if let Some(win) = app.get_webview_window(TRAY_MENU_LABEL) {
        let _ = win.set_position(tauri::Position::Physical(PhysicalPosition {
            x: position.x as i32,
            y: (position.y as i32).saturating_sub(140),
        }));
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }

    let win = WebviewWindowBuilder::new(
        app,
        TRAY_MENU_LABEL,
        WebviewUrl::App("tray-menu.html".into()),
    )
    .title("InkNote Menu")
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .focused(true)
    .visible(true)
    .inner_size(220.0, 148.0)
    .position(position.x, (position.y - 148.0).max(0.0))
    .build()?;

    let _ = win.set_focus();
    Ok(())
}

pub fn hide_tray_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(TRAY_MENU_LABEL) {
        let _ = win.hide();
    }
    Ok(())
}
