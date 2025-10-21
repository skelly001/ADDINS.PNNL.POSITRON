use sandbox_sync::cli;
use std::process;

fn main() {
    match cli::run() {
        Ok(exit_code) => {
            process::exit(exit_code.as_i32());
        }
        Err(e) => {
            eprintln!("Unexpected error: {}", e);
            process::exit(5); // UnexpectedError
        }
    }
}
