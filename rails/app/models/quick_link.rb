class QuickLink < ApplicationRecord
  include ContentRecord

  validates :link_url, presence: true
end
