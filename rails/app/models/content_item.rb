class ContentItem < ApplicationRecord
  include PgSearch::Model

  # The eleven shapes the old thirteen content tables expressed, unified.
  CONTENT_TYPES = %w[
    news quick_link hero_asset content_block team_spotlight
    newsletter bulletin linkedin_post industry_event
  ].freeze

  # nil division = org-wide content that any portal may surface.
  DIVISIONS = User::DIVISIONS

  STATUSES = %w[draft scheduled published archived].freeze

  # -- Rich text + media -----------------------------------------------------
  has_rich_text :body
  has_one_attached :image                 # inline hero/thumbnail for this item
  belongs_to :media_asset, optional: true # reusable library asset (optional)
  belongs_to :author, class_name: "User", optional: true

  # -- Versioning / audit trail (history, diff, rollback) --------------------
  has_paper_trail

  # -- Ordering within a (division, section) list ----------------------------
  acts_as_list scope: [ :division, :section ]

  # -- Validations -----------------------------------------------------------
  validates :section, :title, presence: true
  validates :content_type, inclusion: { in: CONTENT_TYPES }
  validates :status, inclusion: { in: STATUSES }
  validates :division, inclusion: { in: DIVISIONS }, allow_nil: true
  validate  :publish_at_present_when_scheduled

  # -- Search ----------------------------------------------------------------
  pg_search_scope :search,
                  against: [ :title, :subtitle ],
                  associated_against: { rich_text_body: [ :body ] },
                  using: { tsearch: { prefix: true } }

  # -- Scopes ----------------------------------------------------------------
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

  # Roll back to a prior PaperTrail version (audit-safe undo).
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
end
