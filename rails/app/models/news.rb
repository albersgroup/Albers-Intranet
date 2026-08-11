class News < ApplicationRecord
  include ContentRecord

  has_rich_text :body
end
