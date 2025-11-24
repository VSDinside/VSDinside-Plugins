use tauri::{App, Manager};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
pub mod desktop_layer;
pub mod logger;

fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    desktop_layer::setup(app.get_webview_window("main").unwrap().hwnd().unwrap().0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(setup)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_note_cfgs,
            commands::get_note_cfg,
            commands::get_args,
            commands::restore_notes,
            commands::create_note,
            commands::toggle_all_visible,
            commands::set_note_visible,
            commands::set_note_title,
            commands::set_note_content,
            commands::set_note_color,
            commands::set_note_position,
            commands::set_note_size,
            commands::close_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
