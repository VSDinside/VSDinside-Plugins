use std::sync::OnceLock;

use log::info;
use log::LevelFilter;
use log4rs::{
    append::file::FileAppender,
    config::{Appender, Root},
    encode::pattern::PatternEncoder,
    Config,
};

pub struct Logger;
impl Logger {
    pub fn info(&self, msg: &str) {
        info!("{}", msg);
    }
}

fn init_logger() {
    let file_appender = FileAppender::builder()
        .encoder(Box::new(PatternEncoder::new("{d} [{l}] {m}{n}")))
        .build("debug.log")
        .unwrap();
    let config = Config::builder()
        .appender(Appender::builder().build("file", Box::new(file_appender)))
        .build(Root::builder().appender("file").build(LevelFilter::Info))
        .unwrap();

    log4rs::init_config(config).unwrap();
}

static LOGGER: OnceLock<Logger> = OnceLock::new();

pub fn get_logger() -> &'static Logger {
    LOGGER.get_or_init(|| {
        init_logger();
        Logger {}
    })
}
