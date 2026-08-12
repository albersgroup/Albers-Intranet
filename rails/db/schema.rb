# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_11_202636) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "action_text_rich_texts", force: :cascade do |t|
    t.text "body"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.datetime "updated_at", null: false
    t.index ["record_type", "record_id", "name"], name: "index_action_text_rich_texts_uniqueness", unique: true
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "bulletins", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "is_pinned", default: false, null: false
    t.datetime "updated_at", null: false
  end

  create_table "content_blocks", force: :cascade do |t|
    t.string "badges", default: [], null: false, array: true
    t.string "block_key"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["block_key"], name: "index_content_blocks_on_block_key", unique: true
  end

  create_table "content_items", force: :cascade do |t|
    t.bigint "author_id"
    t.bigint "content_record_id"
    t.string "content_record_type"
    t.datetime "created_at", null: false
    t.string "division"
    t.bigint "media_asset_id"
    t.integer "position", default: 0, null: false
    t.datetime "publish_at"
    t.string "section", null: false
    t.string "status", default: "draft", null: false
    t.string "subtitle"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["author_id"], name: "index_content_items_on_author_id"
    t.index ["content_record_type", "content_record_id"], name: "idx_on_content_record_type_content_record_id_f4129b58a8", unique: true
    t.index ["division", "section", "position"], name: "index_content_items_on_division_and_section_and_position"
    t.index ["media_asset_id"], name: "index_content_items_on_media_asset_id"
    t.index ["publish_at"], name: "index_content_items_on_publish_at"
    t.index ["status"], name: "index_content_items_on_status"
  end

  create_table "hero_assets", force: :cascade do |t|
    t.string "alt_text"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "industry_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "end_date"
    t.string "location"
    t.date "start_date"
    t.datetime "updated_at", null: false
    t.string "vertical"
  end

  create_table "linkedin_posts", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "external_ref"
    t.datetime "updated_at", null: false
  end

  create_table "media_assets", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "description"
    t.string "title"
    t.datetime "updated_at", null: false
  end

  create_table "news", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "is_pinned", default: false, null: false
    t.datetime "updated_at", null: false
  end

  create_table "newsletters", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "is_current", default: false, null: false
    t.datetime "updated_at", null: false
  end

  create_table "quick_links", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "icon"
    t.string "icon_color"
    t.string "link_url", null: false
    t.datetime "updated_at", null: false
  end

  create_table "team_spotlights", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "department"
    t.string "employee_name"
    t.string "employee_role"
    t.string "spotlight_type"
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "division"
    t.string "email", null: false
    t.string "entra_oid"
    t.string "name"
    t.string "role", default: "viewer", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["entra_oid"], name: "index_users_on_entra_oid", unique: true
  end

  create_table "versions", force: :cascade do |t|
    t.datetime "created_at"
    t.string "event", null: false
    t.bigint "item_id", null: false
    t.string "item_type", null: false
    t.text "object"
    t.string "whodunnit"
    t.index ["item_type", "item_id"], name: "index_versions_on_item_type_and_item_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "content_items", "users", column: "author_id"
end
