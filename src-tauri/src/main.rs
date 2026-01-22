// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Spawn server startup in background
            std::thread::spawn(move || {
                if let Err(e) = start_server(&app_handle) {
                    eprintln!("Failed to start server: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn start_server(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get the resource directory where server files are bundled
    let resource_dir = app.path().resource_dir()?;
    let server_dir = resource_dir.join("server");

    // Check if we're in production (bundled) or development mode
    if server_dir.exists() {
        // Production: use bundled sidecar (Node.js) and server script
        start_production_server(app, &server_dir)
    } else {
        // Development: use system node and local cli.js
        start_development_server(app)
    }
}

fn start_production_server(app: &tauri::AppHandle, server_dir: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar = app.shell().sidecar("node-server")?;
    let cli_path = server_dir.join("cli.js");

    // Spawn the sidecar (Node.js) with the cli.js script as first argument
    let (mut rx, _child) = sidecar
        .args([
            cli_path.to_string_lossy().to_string(),
            "ui".to_string(),
            "--foreground".to_string(),
            "--port".to_string(),
            "3333".to_string(),
        ])
        .env("NODE_PATH", server_dir.join("node_modules").to_string_lossy().to_string())
        .spawn()?;

    // Log output in background
    std::thread::spawn(move || {
        while let Some(event) = rx.blocking_recv() {
            handle_command_event(event);
        }
    });

    Ok(())
}

fn start_development_server(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let cli_path = find_dev_cli_path();

    let shell = app.shell();
    let (mut rx, _child) = shell
        .command("node")
        .args([&cli_path, "ui", "--foreground", "--port", "3333"])
        .spawn()?;

    // Log output in background
    std::thread::spawn(move || {
        while let Some(event) = rx.blocking_recv() {
            handle_command_event(event);
        }
    });

    Ok(())
}

fn handle_command_event(event: CommandEvent) {
    match event {
        CommandEvent::Stdout(line) => {
            if let Ok(s) = String::from_utf8(line) {
                println!("[server] {}", s);
            }
        }
        CommandEvent::Stderr(line) => {
            if let Ok(s) = String::from_utf8(line) {
                eprintln!("[server] {}", s);
            }
        }
        CommandEvent::Error(e) => {
            eprintln!("[server error] {}", e);
        }
        CommandEvent::Terminated(status) => {
            println!("[server] terminated with status: {:?}", status);
        }
        _ => {}
    }
}

fn find_dev_cli_path() -> String {
    // In development, cli.js is in the project root (parent of src-tauri)
    let possible_paths = [
        "../cli.js",
        "../../cli.js",
        "cli.js",
    ];

    for path in &possible_paths {
        if std::path::Path::new(path).exists() {
            return path.to_string();
        }
    }

    // Default
    "../cli.js".to_string()
}
