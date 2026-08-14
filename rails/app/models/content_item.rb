class ContentItem < ApplicationRecord
  include PgSearch::Model

  # The CMS envelope shared by every content type: placement on a portal,
  # publish lifecycle, and a pointer at the concrete record that holds the
  # type-specific fields (body, link_url, dates, ...). See
  # docs/CONTENT_MODEL_SPLIT_PLAN.md for why this is delegated_type rather
  # than a single content_type column or STI.
  delegated_type :content_record, types: %w[
    News QuickLink HeroAsset ContentBlock TeamSpotlight
    Newsletter Bulletin LinkedinPost IndustryEvent
  ], dependent: :destroy

  # HeroAsset/Newsletter are "only one active per division" — publishing one
  # archives the others. See #enforce_singleton_per_division below.
  SINGLETON_PER_DIVISION_TYPES = %w[HeroAsset Newsletter].freeze

  # nil division = org-wide content that any portal may surface.
  DIVISIONS = User::DIVISIONS

  STATUSES = %w[draft scheduled published archived].freeze

  # -- Media -------------------------------------------------------------
  has_one_attached :image                 # inline hero/thumbnail for this item
  belongs_to :media_asset, optional: true # reusable library asset (optional)
  belongs_to :author, class_name: "User", optional: true

  # -- Versioning / audit trail (placement + lifecycle changes) ----------
  has_paper_trail

  # -- Ordering within a (division, section) list -------------------------
  acts_as_list scope: [ :division, :section ]

  # -- Validations ----------------------------------------------------------
  validates :section, :title, presence: true
  validates :content_record, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :division, inclusion: { in: DIVISIONS }, allow_nil: true
  validate  :publish_at_present_when_scheduled

  # The admin UI's "Org-wide (all portals)" choice is a blank <option>, which
  # posts "" rather than nil. Normalizing keeps org-wide content valid and
  # keeps `for_division`/acts_as_list scoping on a single nil representation.
  normalizes :division, with: ->(d) { d.presence }

  # -- Search ------------------------------------------------------------
  # Scoped to the shared title/subtitle fields only. pg_search's
  # associated_against needs a real, single-target association to join on;
  # content_record is polymorphic, and joining each concrete type's table on
  # the shared content_record_id column risks matching the wrong type's row
  # when ids collide across tables (e.g. News#3 vs. QuickLink#3). Searching
  # into each type's body would need PgSearch multisearch (a separate index
  # table) or a per-type join guarded on content_record_type — worth doing if
  # search quality becomes a real gap, not before.
  pg_search_scope :search,
                  against: [ :title, :subtitle ],
                  using: { tsearch: { prefix: true } }

  # -- Scopes --------------------------------------------------------------
  scope :for_division, ->(division) { where(division: [ division, nil ]) }
  scope :in_section,   ->(section)  { where(section: section) }
  scope :ordered,      -> { order(:position, :created_at) }

  # "Live" = anything the public should see now: explicitly published, or
  # scheduled with its publish time already reached. This makes rendering
  # correct even if the scheduled-publish job has not run yet.
  scope :live, -> {
    where("content_items.status = ? OR (content_items.status = ? AND content_items.publish_at <= ?)",
          "published", "scheduled", Time.current)
  }

  scope :scheduled_due, -> {
    where(status: "scheduled").where(publish_at: ..Time.current)
  }

  # -- State helpers ---------------------------------------------------------
  STATUSES.each do |s|
    define_method("#{s}?") { status == s }
  end

  def live?
    published? || (scheduled? && publish_at.present? && publish_at <= Time.current)
  end

  # Publish now (used by the admin action and the scheduled-publish job).
  def publish!
    update!(status: "published", publish_at: publish_at || Time.current)
  end

  # Roll back to a prior PaperTrail version (audit-safe undo). Placement/
  # lifecycle fields only — the concrete record has its own version history
  # for its own fields (body, link_url, ...).
  def rollback_to!(version_id)
    version = versions.find(version_id)
    version.reify.save!
  end

  private

  def publish_at_present_when_scheduled
    if status == "scheduled" && publish_at.blank?
      errors.add(:publish_at, "is required when scheduling")
    end
  end

  after_save :enforce_singleton_per_division

  def enforce_singleton_per_division
    return unless SINGLETON_PER_DIVISION_TYPES.include?(content_record_type)
    return unless status == "published" && content_record.active_for_singleton?

    self.class
      .where(content_record_type: content_record_type, division: division, status: "published")
      .where.not(id: id)
      .find_each { |sibling| sibling.update!(status: "archived") }
  end
end
