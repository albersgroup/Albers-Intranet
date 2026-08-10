class MediaAsset < ApplicationRecord
  # A reusable upload in the media library. Uploaded once, referenced from any
  # number of content items rather than re-uploaded per placement.
  has_one_attached :file
  has_many :content_items, dependent: :nullify

  validates :title, presence: true
  validate :file_present

  def byte_size
    file.attached? ? file.byte_size : 0
  end

  def content_type
    file.attached? ? file.content_type : nil
  end

  def image?
    content_type.to_s.start_with?("image/")
  end

  private

  def file_present
    errors.add(:file, "must be attached") unless file.attached?
  end
end
