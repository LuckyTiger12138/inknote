use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, PhysicalSize, Runtime, WebviewUrl,
    WebviewWindowBuilder, WindowEvent,
};

/// When true, the next exit is allowed (user chose Quit from tray).
static ALLOW_EXIT: AtomicBool = AtomicBool::new(false);
/// Menu is currently supposed to be visible.
static MENU_OPEN: AtomicBool = AtomicBool::new(false);
/// Ignore focus-loss briefly after showing menu (show/focus races).
static MENU_FOCUS_ARMED_AT: std::sync::Mutex<Option<Instant>> = std::sync::Mutex::new(None);

const TRAY_MENU_LABEL: &str = "tray-menu";
/// Logical size of the popup (matches tray-menu.html panel).
const MENU_W: f64 = 212.0;
const MENU_H: f64 = 100.0;

pub fn request_quit<R: Runtime>(app: &AppHandle<R>) {
    ALLOW_EXIT.store(true, Ordering::SeqCst);
    let _ = hide_tray_menu(app);
    app.exit(0);
}

pub fn should_prevent_exit() -> bool {
    !ALLOW_EXIT.load(Ordering::SeqCst)
}

pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    ensure_tray_menu_window(app)?;

    let mut builder = TrayIconBuilder::with_id("inknote-tray")
        .tooltip("InkNote")
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
                    rect,
                    ..
                } => {
                    // Toggle: second right-click closes
                    if MENU_OPEN.load(Ordering::SeqCst) {
                        let _ = hide_tray_menu(app);
                    } else {
                        let _ = show_tray_menu(app, position, Some(rect));
                    }
                }
                _ => {}
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    let tray = builder.build(app)?;
    app.manage(tray);
    Ok(())
}

pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    let _ = hide_tray_menu(app);
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

fn arm_menu_focus_guard() {
    if let Ok(mut g) = MENU_FOCUS_ARMED_AT.lock() {
        *g = Some(Instant::now() + Duration::from_millis(400));
    }
}

fn focus_guard_active() -> bool {
    match MENU_FOCUS_ARMED_AT.lock() {
        Ok(g) => match *g {
            Some(until) => Instant::now() < until,
            None => false,
        },
        Err(_) => false,
    }
}

fn ensure_tray_menu_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    if app.get_webview_window(TRAY_MENU_LABEL).is_some() {
        return Ok(());
    }

    let app_handle = app.clone();
    // Small solid popup — not a fullscreen transparent overlay.
    // Transparent fullscreen windows on Windows often ignore clicks on near-zero
    // alpha pixels, so outside-click never reaches the page and focus can stick.
    let win = WebviewWindowBuilder::new(
        app,
        TRAY_MENU_LABEL,
        WebviewUrl::App("tray-menu.html".into()),
    )
    .title("InkNote Menu")
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .closable(false)
    .focused(false)
    .visible(false)
    .inner_size(MENU_W, MENU_H)
    .position(-10000.0, -10000.0)
    .build()?;

    let _ = win.set_ignore_cursor_events(false);

    // Standard popup behavior: lose focus → close.
    // During the arm window, reclaim focus instead of ignoring (prevents stuck open).
    win.on_window_event(move |event| {
        if let WindowEvent::Focused(focused) = event {
            if *focused {
                return;
            }
            if !MENU_OPEN.load(Ordering::SeqCst) {
                return;
            }
            if focus_guard_active() {
                if let Some(w) = app_handle.get_webview_window(TRAY_MENU_LABEL) {
                    let _ = w.set_focus();
                }
                return;
            }
            let _ = hide_tray_menu(&app_handle);
        }
    });

    Ok(())
}

fn show_tray_menu<R: Runtime>(
    app: &AppHandle<R>,
    cursor: PhysicalPosition<f64>,
    tray_rect: Option<tauri::Rect>,
) -> tauri::Result<()> {
    ensure_tray_menu_window(app)?;
    let Some(win) = app.get_webview_window(TRAY_MENU_LABEL) else {
        return Ok(());
    };

    let monitor = win
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| win.primary_monitor().ok().flatten());

    let (mon_x, mon_y, mon_w, mon_h, scale) = if let Some(m) = monitor {
        let pos = m.position();
        let size = m.size();
        (pos.x, pos.y, size.width, size.height, m.scale_factor())
    } else {
        (0, 0, 1920, 1080, 1.0)
    };

    let (anchor_x, anchor_y) = if let Some(rect) = tray_rect {
        let pos = rect.position.to_physical::<f64>(scale);
        let size = rect.size.to_physical::<f64>(scale);
        (pos.x + size.width / 2.0, pos.y)
    } else {
        (cursor.x, cursor.y)
    };

    // Physical pixel size of popup
    let phys_w = (MENU_W * scale).round() as u32;
    let phys_h = (MENU_H * scale).round() as u32;

    // Place above tray icon, clamped to monitor
    let mut x = (anchor_x - phys_w as f64 / 2.0).round() as i32;
    let mut y = (anchor_y - phys_h as f64 - 8.0 * scale).round() as i32;

    let mon_right = mon_x + mon_w as i32;
    let mon_bottom = mon_y + mon_h as i32;
    let pad = (8.0 * scale).round() as i32;

    if x < mon_x + pad {
        x = mon_x + pad;
    }
    if x + phys_w as i32 > mon_right - pad {
        x = mon_right - pad - phys_w as i32;
    }
    // If not enough room above, open below the tray
    if y < mon_y + pad {
        y = (anchor_y + 8.0 * scale).round() as i32;
    }
    if y + phys_h as i32 > mon_bottom - pad {
        y = mon_bottom - pad - phys_h as i32;
    }

    let _ = win.set_size(tauri::Size::Physical(PhysicalSize {
        width: phys_w,
        height: phys_h,
    }));
    let _ = win.set_position(tauri::Position::Physical(PhysicalPosition { x, y }));
    let _ = win.set_ignore_cursor_events(false);

    MENU_OPEN.store(true, Ordering::SeqCst);
    arm_menu_focus_guard();

    let _ = win.show();
    let _ = win.set_focus();

    // Ensure panel paints in the small window
    let _ = win.eval(
        "window.__inknotePlaceMenu && window.__inknotePlaceMenu();",
    );

    // Re-focus a few times while arm is active (tray click steals focus on Windows)
    let win2 = win.clone();
    std::thread::spawn(move || {
        for delay_ms in [30_u64, 80, 160, 280] {
            std::thread::sleep(Duration::from_millis(delay_ms));
            if !MENU_OPEN.load(Ordering::SeqCst) {
                break;
            }
            let _ = win2.eval("window.__inknotePlaceMenu && window.__inknotePlaceMenu();");
            let _ = win2.set_focus();
        }
    });

    Ok(())
}

pub fn hide_tray_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    MENU_OPEN.store(false, Ordering::SeqCst);
    if let Ok(mut g) = MENU_FOCUS_ARMED_AT.lock() {
        *g = None;
    }
    if let Some(win) = app.get_webview_window(TRAY_MENU_LABEL) {
        let _ = win.hide();
        let _ = win.set_position(tauri::Position::Physical(PhysicalPosition {
            x: -10000,
            y: -10000,
        }));
    }
    Ok(())
}
