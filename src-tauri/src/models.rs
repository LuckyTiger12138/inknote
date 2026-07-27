use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub preview: String,
    pub tags: Vec<String>,
    pub notebook_id: Option<String>,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notebook {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub sort_order: i64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub editor_font_size: i64,
    pub auto_save_ms: i64,
    pub preview_mode: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".into(),
            editor_font_size: 16,
            auto_save_ms: 1000,
            preview_mode: "preview".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct NoteFilter {
    pub notebook_id: Option<String>,
    pub tag: Option<String>,
    pub favorites_only: bool,
    pub trash_only: bool,
    /// Notes with no group (notebook_id IS NULL)
    pub ungrouped_only: bool,
    pub query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteInput {
    pub title: Option<String>,
    pub content: Option<String>,
    pub notebook_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteInput {
    pub id: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    /// Set group id; ignored when clear_notebook is true
    #[serde(default)]
    pub notebook_id: Option<String>,
    /// When true, clear notebook_id (ungroup). Needed because JSON null
    /// cannot express Option<Option<T>> reliably from the webview.
    #[serde(default)]
    pub clear_notebook: Option<bool>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub is_pinned: Option<bool>,
    #[serde(default)]
    pub is_favorite: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotebookInput {
    pub name: String,
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagCount {
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppBootstrap {
    pub notes: Vec<Note>,
    pub notebooks: Vec<Notebook>,
    pub tags: Vec<TagCount>,
    pub settings: AppSettings,
}
