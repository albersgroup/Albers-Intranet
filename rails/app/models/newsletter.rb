class Newsletter < ApplicationRecord
  include ContentRecord

  has_one_attached :file

  def active_for_singleton?
    is_current
  end
end
