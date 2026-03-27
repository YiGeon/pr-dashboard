use std::net::TcpListener;
use std::io::{Read, Write};
use tauri::Emitter;

const CLIENT_ID: &str = env!("GITHUB_CLIENT_ID");
const CLIENT_SECRET: &str = env!("GITHUB_CLIENT_SECRET");

#[tauri::command]
pub async fn start_oauth(app: tauri::AppHandle) -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect_uri = format!("http://localhost:{}/callback", port);

    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&redirect_uri={}&scope=read:org,repo",
        CLIENT_ID,
        urlencoding::encode(&redirect_uri)
    );

    let app_handle = app.clone();
    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buf = [0u8; 4096];
            if let Ok(n) = stream.read(&mut buf) {
                let request = String::from_utf8_lossy(&buf[..n]);
                if let Some(code) = extract_code(&request) {
                    let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><body><h2>Authentication successful!</h2><p>You can close this window.</p></body></html>";
                    let _ = stream.write_all(response.as_bytes());

                    if let Ok(token) = exchange_code(&code, &redirect_uri) {
                        let _ = app_handle.emit("oauth-token", token);
                    }
                }
            }
        }
    });

    Ok(auth_url)
}

fn extract_code(request: &str) -> Option<String> {
    let first_line = request.lines().next()?;
    let path = first_line.split_whitespace().nth(1)?;
    let query = path.split('?').nth(1)?;
    for param in query.split('&') {
        let mut kv = param.splitn(2, '=');
        if kv.next()? == "code" {
            return kv.next().map(|s| s.to_string());
        }
    }
    None
}

#[tauri::command]
pub fn get_github_client_id() -> String {
    CLIENT_ID.to_string()
}

fn exchange_code(code: &str, redirect_uri: &str) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        }))
        .send()
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
    body["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No access_token in response".to_string())
}
