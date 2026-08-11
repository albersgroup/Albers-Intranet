class Avo::Resources::IndustryEvent < Avo::BaseResource
  include Avo::ResourceConcerns::ContentEnvelopeFields

  self.title = :title
  self.includes = [ { content_item: [ :author, :media_asset ] } ]
  self.authorization_policy = ContentRecordPolicy

  def fields
    field :id, as: :id
    content_envelope_fields
    field :start_date, as: :date
    field :end_date, as: :date
    field :location, as: :text
    field :vertical, as: :text
  end

  def filters
    content_envelope_filters
  end

  def actions
    action Avo::Actions::PublishNow
  end
end
