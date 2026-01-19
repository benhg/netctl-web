use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetSession {
    pub id: String,
    pub name: String,
    pub frequency: String,
    pub net_control_op: String,
    pub net_control_name: String,
    pub date_time: String,
    pub end_time: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Participant {
    pub id: String,
    pub callsign: String,
    pub tactical_call: String,
    pub name: String,
    pub location: String,
    pub check_in_time: String,
    pub check_in_number: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub id: String,
    pub entry_number: i32,
    pub time: String,
    pub from_callsign: String,
    pub to_callsign: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub session: NetSession,
    pub participants: Vec<Participant>,
    pub log_entries: Vec<LogEntry>,
}
