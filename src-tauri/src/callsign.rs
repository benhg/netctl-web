use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallsignLookupResult {
    pub callsign: String,
    pub name: String,
    pub city: String,
    pub state: String,
    pub country: String,
    pub grid: String,
}

#[derive(Debug, Deserialize)]
struct HamDbResponse {
    hamdb: HamDbData,
}

#[derive(Debug, Deserialize)]
struct HamDbData {
    callsign: Option<HamDbCallsign>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct HamDbCallsign {
    call: Option<String>,
    fname: Option<String>,
    name: Option<String>,
    addr1: Option<String>,
    addr2: Option<String>,
    state: Option<String>,
    country: Option<String>,
    grid: Option<String>,
}

pub async fn lookup_callsign(callsign: &str) -> Option<CallsignLookupResult> {
    let url = format!(
        "https://api.hamdb.org/v1/{}/json/netctl",
        callsign.to_uppercase()
    );

    let response = reqwest::get(&url).await.ok()?;
    let data: HamDbResponse = response.json().await.ok()?;

    let cs = data.hamdb.callsign?;

    let name = match (&cs.fname, &cs.name) {
        (Some(fname), Some(lname)) => format!("{} {}", fname, lname),
        (Some(fname), None) => fname.clone(),
        (None, Some(lname)) => lname.clone(),
        (None, None) => String::new(),
    };

    Some(CallsignLookupResult {
        callsign: cs.call.unwrap_or_else(|| callsign.to_uppercase()),
        name,
        city: cs.addr2.unwrap_or_default(),
        state: cs.state.unwrap_or_default(),
        country: cs.country.unwrap_or_else(|| "USA".to_string()),
        grid: cs.grid.unwrap_or_default(),
    })
}
