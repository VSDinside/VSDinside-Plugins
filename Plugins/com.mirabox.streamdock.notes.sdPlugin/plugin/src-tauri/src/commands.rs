use crate::desktop_layer;
use serde::{Deserialize, Serialize};
use std::{fs, thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use time::{macros::format_description, OffsetDateTime};

#[cfg(target_os = "windows")]
use windows_sys::Win32::{Foundation::POINT, UI::WindowsAndMessaging::GetCursorPos};

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct NoteCfg {
    label: String,
    title: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    content: String,
    color: String,
    is_visible: bool,
}

impl NoteCfg {
    /// 默认 note 配置
    pub fn default() -> Self {
        let now_time = OffsetDateTime::now_utc();
        let format = format_description!("[year]-[month]-[day] [hour]:[minute]:[second]");
        let mut x = 20.0;
        let mut y = 20.0;

        unsafe {
            let mut point = POINT { x: 20, y: 20 };
            if GetCursorPos(&mut point) != 0 {
                x = if point.x as f64 - 125.0 < 0.0 {
                    point.x as f64
                } else {
                    point.x as f64 - 125.0
                };
                y = if point.y as f64 - 10.0 < 0.0 {
                    point.y as f64
                } else {
                    point.y as f64 - 10.0
                };
            }
        }

        Self {
            label: now_time.unix_timestamp_nanos().to_string(),
            title: now_time.format(format).unwrap(),
            x,
            y,
            width: 250.0,
            height: 200.0,
            content: String::new(),
            color: String::from("#f8f8b6"),
            is_visible: true,
        }
    }

    /// 从配置文件获取所有 note 配置
    pub fn get_cfgs() -> Vec<Self> {
        let data = fs::read("notes.json").unwrap_or(Vec::new());
        let data = String::from_utf8(data).unwrap_or(String::new());
        if data.is_empty() {
            Vec::new()
        } else {
            serde_json::from_str(&data).unwrap_or(Vec::new())
        }
    }

    /// 获取某个 note 配置
    pub fn get_cfg(label: &str) -> Self {
        let data = fs::read("notes.json").unwrap_or(Vec::new());
        let data = String::from_utf8(data).unwrap_or(String::new());
        let data: Vec<Self> = if data.is_empty() {
            Vec::new()
        } else {
            serde_json::from_str(&data).unwrap_or(Vec::new())
        };

        data.into_iter()
            .find(|item| item.label == label)
            .unwrap_or(NoteCfg::default())
    }

    /// 持久化一个配置数组
    pub fn set_cfgs(app_handle: &AppHandle, note_cfgs: Vec<NoteCfg>) {
        fs::write(
            "notes.json",
            serde_json::to_string_pretty(&note_cfgs).unwrap(),
        )
        .unwrap();

        app_handle.emit("update_PI_note_cfgs", note_cfgs).unwrap();
    }

    /// 将一个 note 配置持久化
    /// 如果是一个新配置，追加到后面
    /// 如果是一个旧配置，更新这个配置
    pub fn set_cfg(app_handle: &AppHandle, note_cfg: NoteCfg) {
        let data = fs::read("notes.json").unwrap_or(Vec::new());
        let data = String::from_utf8(data).unwrap_or(String::new());
        let mut data: Vec<Self> = if data.is_empty() {
            Vec::new()
        } else {
            serde_json::from_str(&data).unwrap_or(Vec::new())
        };

        let idx = data.iter().position(|item| item.label == note_cfg.label);
        if let Some(idx) = idx {
            data[idx] = note_cfg;
        } else {
            data.push(note_cfg);
        }

        fs::write("notes.json", serde_json::to_string_pretty(&data).unwrap()).unwrap();

        app_handle.emit("update_PI_note_cfgs", data).unwrap();
    }

    /// 删除一个便签配置
    pub fn remove_cfg(app_handle: &AppHandle, label: &str) {
        let data = fs::read("notes.json").unwrap_or(Vec::new());
        let data = String::from_utf8(data).unwrap_or(String::new());
        let mut data: Vec<Self> = if data.is_empty() {
            Vec::new()
        } else {
            serde_json::from_str(&data).unwrap_or(Vec::new())
        };
        data.retain(|item| item.label != label);
        fs::write("notes.json", serde_json::to_string_pretty(&data).unwrap()).unwrap();
        app_handle.emit("update_PI_note_cfgs", data).unwrap();
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SDArgs {
    ws_server_port: u32,
    #[serde(rename = "pluginUUID")]
    plugin_uuid: String,
    register_event: String,
    app_info: String,
}

impl SDArgs {
    pub fn from_cmdline() -> Self {
        let args: Vec<String> = std::env::args().collect();

        Self {
            ws_server_port: args[2].parse::<u32>().unwrap(),
            plugin_uuid: args[4].to_string(),
            register_event: args[6].to_string(),
            app_info: args[8].to_string(),
        }
    }
}

/**************************************** main webview commands ****************************************/

/// 获取便签配置数组
#[tauri::command]
pub fn get_note_cfgs() -> Vec<NoteCfg> {
    NoteCfg::get_cfgs()
}

/// 获取命令行参数
#[tauri::command]
pub fn get_args() -> SDArgs {
    SDArgs::from_cmdline()
}

/// 恢复之前创建过的 note 窗口
#[tauri::command]
pub async fn restore_notes(app_handle: AppHandle) {
    let note_cfgs = NoteCfg::get_cfgs();
    for note_cfg in &note_cfgs {
        let hwnd = WebviewWindowBuilder::new(
            &app_handle,
            &note_cfg.label,
            WebviewUrl::App("note.html".into()),
        )
        .position(note_cfg.x, note_cfg.y)
        .inner_size(note_cfg.width, note_cfg.height)
        .visible(note_cfg.is_visible)
        .maximizable(false)
        .decorations(false)
        .skip_taskbar(true)
        .build()
        .unwrap()
        .hwnd()
        .unwrap()
        .0;

        #[cfg(target_os = "windows")]
        {
            desktop_layer::set_decktop_bottom(hwnd);
        };
        thread::sleep(Duration::from_millis(100));
    }
}

/// 创建新的 note 窗口
#[tauri::command]
pub async fn create_note(app_handle: AppHandle) {
    let def_note_cfg = NoteCfg::default();
    NoteCfg::set_cfg(&app_handle, def_note_cfg.clone());
    let hwnd = WebviewWindowBuilder::new(
        &app_handle,
        def_note_cfg.label,
        WebviewUrl::App("note.html".into()),
    )
    .position(def_note_cfg.x, def_note_cfg.y)
    .inner_size(def_note_cfg.width, def_note_cfg.height)
    .visible(def_note_cfg.is_visible)
    .maximizable(false)
    .decorations(false)
    .skip_taskbar(true)
    .build()
    .unwrap()
    .hwnd()
    .unwrap()
    .0;

    #[cfg(target_os = "windows")]
    {
        desktop_layer::set_decktop_bottom(hwnd);
    };
}

/// 切换所有窗口的可见性
#[tauri::command]
pub async fn toggle_all_visible(app_handle: AppHandle) {
    let mut note_cfgs = NoteCfg::get_cfgs();
    if note_cfgs.is_empty() {
        return;
    }

    let visible = if let Some(_) = note_cfgs.iter().find(|item| item.is_visible) {
        true
    } else {
        false
    };

    for item in note_cfgs.iter_mut() {
        let note_win = app_handle.get_webview_window(&item.label);
        if let Some(note_win) = note_win {
            if visible {
                note_win.hide().unwrap();
            } else {
                note_win.show().unwrap();
            }
        }
        item.is_visible = !visible;
    }

    NoteCfg::set_cfgs(&app_handle, note_cfgs);
}

/// 设置一个 note 的可见性，并持久化配置
#[tauri::command]
pub async fn set_note_visible(app_handle: AppHandle, label: String, visible: bool) {
    let note_win = app_handle.get_webview_window(&label);
    if let Some(note_win) = note_win {
        if visible {
            note_win.show().unwrap();
        } else {
            note_win.hide().unwrap();
        }
        let mut note_cfg = NoteCfg::get_cfg(&label);
        note_cfg.is_visible = visible;
        NoteCfg::set_cfg(&app_handle, note_cfg);
    }
}

/// 设置一个 note 的标题，并持久化配置
#[tauri::command]
pub fn set_note_title(app_handle: AppHandle, label: String, title: String) {
    let note_win = app_handle.get_webview_window(&label);
    if let Some(note_win) = note_win {
        app_handle
            .emit_to(note_win.label(), "update_note_title", &title)
            .unwrap();
        let mut note_cfg = NoteCfg::get_cfg(&label);
        note_cfg.title = title;
        NoteCfg::set_cfg(&app_handle, note_cfg);
    }
}

/**************************************** note webview commands ****************************************/

/// 获取便签配置
#[tauri::command]
pub fn get_note_cfg(webview_window: WebviewWindow) -> NoteCfg {
    NoteCfg::get_cfg(webview_window.label())
}

/// 删除一个便签
#[tauri::command]
pub async fn close_note(app_handle: AppHandle, webview_window: WebviewWindow) {
    NoteCfg::remove_cfg(&app_handle, webview_window.label());
    #[cfg(target_os = "windows")]
    webview_window.close().unwrap();
}

/// 持久化设置 note 的内容
#[tauri::command]
pub fn set_note_content(app_handle: AppHandle, webview_window: WebviewWindow, content: String) {
    let mut note_cfg = NoteCfg::get_cfg(webview_window.label());
    note_cfg.content = content;
    NoteCfg::set_cfg(&app_handle, note_cfg);
}

/// 持久化设置 note 的颜色
#[tauri::command]
pub fn set_note_color(app_handle: AppHandle, webview_window: WebviewWindow, color: String) {
    let mut note_cfg = NoteCfg::get_cfg(webview_window.label());
    note_cfg.color = color;
    NoteCfg::set_cfg(&app_handle, note_cfg);
}

/// 持久化设置 note 的位置
#[tauri::command]
pub fn set_note_position(app_handle: AppHandle, webview_window: WebviewWindow, x: f64, y: f64) {
    let mut note_cfg = NoteCfg::get_cfg(webview_window.label());
    note_cfg.x = x;
    note_cfg.y = y;
    NoteCfg::set_cfg(&app_handle, note_cfg);
}

/// 持久化设置 note 的尺寸
#[tauri::command]
pub fn set_note_size(
    app_handle: AppHandle,
    webview_window: WebviewWindow,
    width: f64,
    height: f64,
) {
    let mut note_cfg = NoteCfg::get_cfg(webview_window.label());
    note_cfg.width = width;
    note_cfg.height = height;
    NoteCfg::set_cfg(&app_handle, note_cfg);
}
