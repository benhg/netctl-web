mod callsign;
mod db;
mod models;

use models::{LogEntry, NetSession, Participant, SessionData};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{Manager, State};

struct DbConnection(Mutex<Connection>);

#[tauri::command]
async fn save_session(
    session: NetSession,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::save_session(&conn, &session).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_participant(
    session_id: String,
    participant: Participant,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::save_participant(&conn, &session_id, &participant).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_log_entry(
    session_id: String,
    entry: LogEntry,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::save_log_entry(&conn, &session_id, &entry).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_session(
    id: String,
    db: State<'_, DbConnection>,
) -> Result<SessionData, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let session = db::load_session(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Session not found".to_string())?;

    let participants = db::load_participants(&conn, &id).map_err(|e| e.to_string())?;
    let log_entries = db::load_log_entries(&conn, &id).map_err(|e| e.to_string())?;

    Ok(SessionData {
        session,
        participants,
        log_entries,
    })
}

#[tauri::command]
async fn lookup_callsign(
    callsign: String,
    db: State<'_, DbConnection>,
) -> Result<Option<callsign::CallsignLookupResult>, String> {
    // Check cache first
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        if let Ok(Some(cached)) = db::get_cached_callsign(&conn, &callsign) {
            return Ok(Some(cached));
        }
    }

    // Lookup from API
    if let Some(result) = callsign::lookup_callsign(&callsign).await {
        // Cache the result
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let _ = db::cache_callsign(&conn, &result);
        Ok(Some(result))
    } else {
        Ok(None)
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let db_path = db::get_db_path(app.handle());
            let conn = Connection::open(&db_path).expect("Failed to open database");
            db::init_db(&conn).expect("Failed to initialize database");
            app.manage(DbConnection(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_session,
            save_participant,
            save_log_entry,
            load_session,
            lookup_callsign,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
