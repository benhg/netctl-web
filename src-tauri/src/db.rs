use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::models::{NetSession, Participant, LogEntry};

pub fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).ok();
    app_dir.join("netctl.db")
}

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            frequency TEXT,
            net_control_op TEXT NOT NULL,
            net_control_name TEXT,
            date_time TEXT NOT NULL,
            end_time TEXT,
            status TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS participants (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            callsign TEXT NOT NULL,
            tactical_call TEXT,
            name TEXT,
            location TEXT,
            check_in_time TEXT NOT NULL,
            check_in_number INTEGER NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )",
        [],
    )?;

    // Migration: add tactical_call column if it doesn't exist
    let _ = conn.execute("ALTER TABLE participants ADD COLUMN tactical_call TEXT", []);
    let _ = conn.execute("ALTER TABLE sessions ADD COLUMN end_time TEXT", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS log_entries (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            entry_number INTEGER NOT NULL,
            time TEXT NOT NULL,
            from_callsign TEXT NOT NULL,
            to_callsign TEXT NOT NULL,
            message TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS callsign_cache (
            callsign TEXT PRIMARY KEY,
            name TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            grid TEXT,
            cached_at TEXT NOT NULL
        )",
        [],
    )?;

    Ok(())
}

pub fn save_session(conn: &Connection, session: &NetSession) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO sessions (id, name, frequency, net_control_op, net_control_name, date_time, end_time, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            session.id,
            session.name,
            session.frequency,
            session.net_control_op,
            session.net_control_name,
            session.date_time,
            session.end_time,
            session.status,
        ],
    )?;
    Ok(())
}

pub fn save_participant(conn: &Connection, session_id: &str, participant: &Participant) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO participants (id, session_id, callsign, tactical_call, name, location, check_in_time, check_in_number)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            participant.id,
            session_id,
            participant.callsign,
            participant.tactical_call,
            participant.name,
            participant.location,
            participant.check_in_time,
            participant.check_in_number,
        ],
    )?;
    Ok(())
}

pub fn save_log_entry(conn: &Connection, session_id: &str, entry: &LogEntry) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO log_entries (id, session_id, entry_number, time, from_callsign, to_callsign, message)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            entry.id,
            session_id,
            entry.entry_number,
            entry.time,
            entry.from_callsign,
            entry.to_callsign,
            entry.message,
        ],
    )?;
    Ok(())
}

pub fn load_session(conn: &Connection, id: &str) -> Result<Option<NetSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, frequency, net_control_op, net_control_name, date_time, end_time, status FROM sessions WHERE id = ?1"
    )?;

    let mut rows = stmt.query(params![id])?;

    if let Some(row) = rows.next()? {
        Ok(Some(NetSession {
            id: row.get(0)?,
            name: row.get(1)?,
            frequency: row.get(2)?,
            net_control_op: row.get(3)?,
            net_control_name: row.get(4)?,
            date_time: row.get(5)?,
            end_time: row.get(6)?,
            status: row.get(7)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn load_participants(conn: &Connection, session_id: &str) -> Result<Vec<Participant>> {
    let mut stmt = conn.prepare(
        "SELECT id, callsign, tactical_call, name, location, check_in_time, check_in_number
         FROM participants WHERE session_id = ?1 ORDER BY check_in_number"
    )?;

    let participants = stmt.query_map(params![session_id], |row| {
        Ok(Participant {
            id: row.get(0)?,
            callsign: row.get(1)?,
            tactical_call: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            name: row.get(3)?,
            location: row.get(4)?,
            check_in_time: row.get(5)?,
            check_in_number: row.get(6)?,
        })
    })?;

    participants.collect()
}

pub fn load_log_entries(conn: &Connection, session_id: &str) -> Result<Vec<LogEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, entry_number, time, from_callsign, to_callsign, message
         FROM log_entries WHERE session_id = ?1 ORDER BY entry_number"
    )?;

    let entries = stmt.query_map(params![session_id], |row| {
        Ok(LogEntry {
            id: row.get(0)?,
            entry_number: row.get(1)?,
            time: row.get(2)?,
            from_callsign: row.get(3)?,
            to_callsign: row.get(4)?,
            message: row.get(5)?,
        })
    })?;

    entries.collect()
}

use crate::callsign::CallsignLookupResult;

pub fn get_cached_callsign(conn: &Connection, callsign: &str) -> Result<Option<CallsignLookupResult>> {
    let mut stmt = conn.prepare(
        "SELECT callsign, name, city, state, country, grid FROM callsign_cache WHERE callsign = ?1"
    )?;

    let mut rows = stmt.query(params![callsign])?;

    if let Some(row) = rows.next()? {
        Ok(Some(CallsignLookupResult {
            callsign: row.get(0)?,
            name: row.get(1)?,
            city: row.get(2)?,
            state: row.get(3)?,
            country: row.get(4)?,
            grid: row.get(5)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn cache_callsign(conn: &Connection, result: &CallsignLookupResult) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO callsign_cache (callsign, name, city, state, country, grid, cached_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
        params![
            result.callsign,
            result.name,
            result.city,
            result.state,
            result.country,
            result.grid,
        ],
    )?;
    Ok(())
}
