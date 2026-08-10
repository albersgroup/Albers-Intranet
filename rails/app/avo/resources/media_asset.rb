class Avo::Resources::MediaAsset < Avo::BaseResource
  self.title = :title
  self.includes = [ file_attachment: :blob ]

  def fields
    field :id, as: :id
    field :title, as: :text, required: true
    field :description, as: :textarea
    field :file, as: :file, is_image: true, required: true
    field :content_type, as: :text, readonly: true, only_on: [ :index, :show ]
    field :content_items, as: :has_many
    field :created_at, as: :date_time, only_on: [ :show ]
  end
end
