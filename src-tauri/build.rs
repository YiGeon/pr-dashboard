fn main() {
    // 프로젝트 루트의 .env 파일에서 환경변수를 읽어 빌드 시 주입
    let dotenv_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../.env");
    if dotenv_path.exists() {
        for item in dotenvy::from_path_iter(&dotenv_path).unwrap() {
            let (key, value) = item.unwrap();
            println!("cargo:rustc-env={}={}", key, value);
        }
    }
    println!("cargo:rerun-if-changed=../.env");

    tauri_build::build()
}
