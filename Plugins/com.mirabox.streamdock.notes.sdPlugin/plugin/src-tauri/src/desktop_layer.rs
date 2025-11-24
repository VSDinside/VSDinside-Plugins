//
//
/******************************************* 将窗口置底 ******************************************/

use std::mem::transmute;
use windows_sys::Win32::{
    Foundation::{HWND, LPARAM, WPARAM},
    UI::WindowsAndMessaging::{
        CallWindowProcW, FindWindowA, GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos,
        GWLP_WNDPROC, GWL_EXSTYLE, GWL_STYLE, HWND_BOTTOM, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        SWP_NOZORDER, WINDOWPOS, WM_WINDOWPOSCHANGING, WS_DISABLED, WS_EX_TOOLWINDOW, WS_POPUP,
    },
};

type WndProc = unsafe extern "system" fn(HWND, u32, WPARAM, LPARAM) -> isize;
static mut ORIGINAL_WNDPROC: Option<isize> = None;
unsafe extern "system" fn new_wndproc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> isize {
    match msg {
        WM_WINDOWPOSCHANGING => {
            let pos = lparam as *mut WINDOWPOS;
            (*pos).flags |= SWP_NOZORDER;
        }
        _ => {}
    }
    if let Some(orig) = ORIGINAL_WNDPROC {
        CallWindowProcW(
            Some(transmute::<isize, WndProc>(orig)),
            hwnd,
            msg,
            wparam,
            lparam,
        )
    } else {
        0
    }
}

unsafe fn set_position_window(hwnd: HWND) {
    SetWindowPos(
        hwnd,
        HWND_BOTTOM,
        0,
        0,
        0,
        0,
        SWP_NOMOVE | SWP_NOACTIVATE | SWP_NOSIZE,
    );
    ORIGINAL_WNDPROC = Some(GetWindowLongPtrW(hwnd, GWLP_WNDPROC));
    SetWindowLongPtrW(hwnd, GWLP_WNDPROC, new_wndproc as isize);
    SetWindowLongPtrW(hwnd, GWL_STYLE, WS_POPUP as isize | WS_DISABLED as isize);
    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, WS_EX_TOOLWINDOW as isize);
}

pub fn setup(hwnd: HWND) {
    unsafe {
        set_position_window(hwnd);
    }
}

pub fn set_decktop_bottom(hwnd: HWND) {
    unsafe {
        let pos_win = FindWindowA(
            "Tauri Window\0".as_ptr() as *const u8,
            "plugin\0".as_ptr() as *const u8,
        );

        SetWindowPos(hwnd, pos_win, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
        ORIGINAL_WNDPROC = Some(GetWindowLongPtrW(hwnd, GWLP_WNDPROC));
        SetWindowLongPtrW(hwnd, GWLP_WNDPROC, new_wndproc as isize);
    }
}
