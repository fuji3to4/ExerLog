export const en = {
  // Shell navigation
  nav_today: "Today",
  nav_library: "Library",
  nav_history: "History",
  nav_self_care: "Condition",
  nav_aria_label: "Primary",

  // Language labels
  language_ja: "日本語",
  language_en: "English",

  // Today screen
  today_heading: "Today",
  today_subheading: "Save how you feel, then log today's recommended exercises with one tap.",
  today_loading_heading: "Loading today's log...",
  today_loading_text: "Checking your saved condition and exercise results for this day.",
  today_recommended_heading: "Recommended for today",
  today_recommended_text: "Today's list stays short so it's easy to start. Watch a clip or log the result right away.",
  today_library_card_heading: "Need something else?",
  today_library_card_text: "Browse the full library if you want a different movement or more context.",
  today_library_button: "Library",

  // Daily condition
  condition_heading: "Daily condition",
  condition_subheading: "Pick how you feel today, add a quick note, then save it for today's plan.",
  condition_legend: "How are you feeling?",
  condition_good: "Feeling good",
  condition_okay: "Okay",
  condition_tired: "Tired",
  condition_note_label: "Note",
  condition_note_placeholder: "Add anything worth remembering for today.",
  condition_save_button: "Save condition",
  condition_save_error: "Failed to save. Please try again.",

  // Library screen
  library_heading: "Library",
  library_subheading: "Browse the full exercise catalog and open a detail page when you want the video and quick logging tools.",
  library_filters_heading: "Find an exercise",
  library_filters_subheading: "Use a simple search or narrow the list with one or two filters.",
  library_search_label: "Search exercises",
  library_search_placeholder: "Search by title or description",

  // History screen
  history_heading: "History",
  history_subheading: "Review your completed days and open a quick summary for the exercises and condition you logged.",
  history_calendar_heading: "Calendar",
  history_calendar_text: "Select a completed day to review your logged exercises and note.",
  history_calendar_completed_label: "{date}, completed",
  history_calendar_prev_month: "Previous month",
  history_calendar_next_month: "Next month",
  history_day_summary_heading: "Day summary",
  history_day_summary_empty: "Select a day from the calendar to review what you logged.",
  history_mode_view: "View",
  history_mode_edit: "Edit",
  history_exercises_heading: "Exercises",
  history_no_exercises: "No logged exercises for this day.",
  history_condition_heading: "Condition",
  history_wellness_heading: "Wellness",
  history_metrics_heading: "Metrics",
  history_self_care_heading: "Self Care",
  history_mode_summary: "Summary",
  history_mode_graphs: "Graphs",
  history_graphs_heading: "Graphs",
  history_graphs_empty: "No data available for the selected range.",
  history_graph_metric_label: "Metric",

  // Condition screen (self-care)
  self_care_heading: "Condition",
  self_care_subheading: "Review your body and mind, then save a quick wellness check-in.",
  self_care_save_button: "Save check-in",
  self_care_wellness_heading: "Wellness check-in",
  self_care_physical_label: "Physical",
  self_care_mental_label: "Mental",
  self_care_metrics_heading: "Metrics",
  self_care_metric_height: "Height",
  self_care_metric_weight: "Weight",
  self_care_metric_body_fat: "Body fat",
  self_care_logs_heading: "Logs",
  self_care_done_label: "Done",
  self_care_count_label: "Count",
  self_care_minutes_label: "Minutes",
  self_care_note_label: "Note",

  // Metadata labels
  meta_duration: "Duration",
  meta_intensity: "Intensity",
  meta_body_area: "Body area",
  meta_purpose: "Purpose",

  // Intensity values
  intensity_low: "Low",
  intensity_medium: "Medium",
  intensity_high: "High",
  intensity_any: "Any intensity",

  // Body area values
  body_area_upper_body: "Upper body",
  body_area_lower_body: "Lower body",
  body_area_full_body: "Full body",
  body_area_all: "All body areas",

  // Purpose values
  purpose_warmup: "Warmup",
  purpose_mobility: "Mobility",
  purpose_strength: "Strength",
  purpose_recovery: "Recovery",
  purpose_endurance: "Endurance",
  purpose_all: "All purposes",

  // Duration values
  duration_any: "Any duration",
  duration_minutes: "{count} min",

  // Exercise logging results
  result_did: "Did it",
  result_partial: "Partly",
  result_couldnt: "Couldn't",
  result_saved_did: "Saved: Did it",
  result_saved_partial: "Saved: Partly",
  result_saved_couldnt: "Saved: Couldn't",
  result_not_logged: "Not logged yet",
  result_group_label: "Log exercise result",

  // Common actions
  action_watch: "Watch",
  action_watch_aria: "Watch {title}",
  action_watch_video: "Watch video",

  // Detail screen
  detail_loading_heading: "Loading today's log...",
  detail_loading_text: "Checking whether you already logged this exercise for today.",
  exercise_not_found: "Exercise not found.",

  // Settings screen
  nav_settings: "Settings",
  settings_heading: "Settings",
  settings_library_section_heading: "Library Management",
  settings_data_section_heading: "Data Management",

  // Library management
  settings_library_add: "+ Add exercise",
  settings_library_empty: "No exercises yet. Add one or import a CSV.",
  settings_exercise_delete_confirm: "Delete this exercise?",
  settings_exercise_delete_has_logs: "This exercise has {count} log(s). Deleting it won't remove the logs, but the exercise name may not display correctly in history.",

  // Exercise form modal
  settings_form_add_heading: "Add exercise",
  settings_form_edit_heading: "Edit exercise",
  settings_form_title_label: "Title",
  settings_form_description_label: "Description (optional)",
  settings_form_video_url_label: "Video URL",
  settings_form_thumbnail_url_label: "Thumbnail URL (optional)",
  settings_form_thumbnail_preview_alt: "Thumbnail preview",
  settings_form_body_area_label: "Body area",
  settings_form_purpose_label: "Purpose",
  settings_form_duration_label: "Duration (minutes)",
  settings_form_intensity_label: "Intensity",
  settings_form_save: "Save",
  settings_form_cancel: "Cancel",

  // Data management
  settings_export_exercises: "Export exercises (CSV)",
  settings_import_exercises: "Import exercises (CSV)",
  settings_import_confirm: "This will replace all exercises. Continue?",
  settings_import_success: "Imported {count} exercise(s).",
  settings_import_error: "Import failed: {error}",
  settings_export_logs: "Export exercise logs (CSV)",
  settings_export_daily_wellness: "Export daily wellness records (CSV)",
  settings_export_daily_metrics: "Export body metrics records (CSV)",
  settings_export_conditions_legacy: "Export legacy condition records (CSV)",
  settings_delete_all_exercises: "Delete all exercises",
  settings_delete_all_exercises_confirm: "Delete all {count} exercises? This cannot be undone.",
  settings_delete_all_logs: "Delete all logs",
  settings_delete_all_logs_confirm: "Delete all {count} log entries? This cannot be undone.",
  settings_delete_confirm_btn: "Yes, delete all",
  settings_delete_cancel_btn: "Cancel",
  settings_delete_success_exercises: "All exercises deleted.",
  settings_delete_success_logs: "All logs deleted.",

  // Common actions
  action_edit: "Edit",
  action_delete: "Delete",

  // History edit/delete
  history_edit_heading_log: "Edit exercise log",
  history_edit_heading_condition: "Edit condition",
  history_edit_date_label: "Date",
  history_edit_exercise_label: "Exercise",
  history_edit_result_label: "Result",
  history_edit_save: "Save",
  history_edit_cancel: "Cancel",
  history_log_delete_confirm: "Delete this log entry?",
  history_condition_delete_confirm: "Delete condition record for this day?",
  history_metrics_add_height: "Add height",
  history_metrics_add_weight: "Add weight",
  history_metrics_add_body_fat: "Add body fat",
  history_metrics_delete_height: "Delete height",
  history_metrics_delete_weight: "Delete weight",
  history_metrics_delete_body_fat: "Delete body fat",
  history_metric_delete_confirm: "Delete this metric record?",
  history_wellness_add: "Add wellness",
  history_wellness_edit: "Edit wellness",
  history_wellness_delete: "Delete wellness",
  history_wellness_delete_confirm: "Delete wellness record for this day?",
} as const;
