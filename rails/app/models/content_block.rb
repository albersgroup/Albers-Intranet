class ContentBlock < ApplicationRecord
  include ContentRecord

  has_rich_text :body

  validates :block_key, uniqueness: true, allow_nil: true
end
