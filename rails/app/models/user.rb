class User < ApplicationRecord
  # Divisions mirror the surviving intranet portals. `nil` division = org-wide
  # (a system admin who is not scoped to a single division).
  DIVISIONS = %w[corporate defense industrials advanced_programs bou].freeze

  # Roles map from Entra ID group claims (see SessionsController). `admin` is
  # org-wide; `division_admin` can only manage content in their own division;
  # `viewer` is read-only.
  ROLES = %w[admin division_admin viewer].freeze

  has_many :authored_content_items,
           class_name: "ContentItem",
           foreign_key: :author_id,
           inverse_of: :author,
           dependent: :nullify

  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :role, inclusion: { in: ROLES }
  validates :division, inclusion: { in: DIVISIONS }, allow_nil: true

  normalizes :email, with: ->(e) { e.strip.downcase }
  # The admin UI's "Org-wide" choice is a blank <option>, which posts "" rather
  # than nil. Without this, `inclusion ... allow_nil: true` rejects it and
  # org-wide users can't be saved at all.
  normalizes :division, with: ->(d) { d.presence }

  def admin?           = role == "admin"
  def division_admin?  = role == "division_admin"

  # Can this user edit content for the given division?
  def can_edit_division?(target_division)
    return true if admin?
    division_admin? && division == target_division
  end

  def display_name
    name.presence || email
  end

  # Upsert a user from Entra ID (or dev-login) claims.
  def self.from_omniauth(auth)
    email = auth.dig("info", "email") || auth.dig("extra", "raw_info", "preferred_username")
    find_or_initialize_by(email: email.to_s.downcase).tap do |user|
      user.entra_oid ||= auth["uid"]
      user.name = auth.dig("info", "name").presence || user.name
      user.role ||= "viewer"
      user.save!
    end
  end
end
