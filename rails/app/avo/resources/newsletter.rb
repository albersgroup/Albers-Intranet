class Avo::Resources::Newsletter < Avo::BaseResource
  include Avo::ResourceConcerns::ContentEnvelopeFields

  self.title = :title
  self.includes = [ { content_item: [ :author, :media_asset ] } ]
  self.authorization_policy = ContentRecordPolicy

  def fields
    field :id, as: :id
    content_envelope_fields
    field :file, as: :file, hide_on: [ :index ]
    field :is_current, as: :boolean,
      help: "Only one newsletter per division can be current — setting this archives the others."
  end

  def filters
    content_envelope_filters
  end

  def actions
    action Avo::Actions::PublishNow
  end
end
