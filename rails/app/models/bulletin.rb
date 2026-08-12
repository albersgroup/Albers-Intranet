class Bulletin < ApplicationRecord
  include ContentRecord

  has_rich_text :body
end
