class Avo::Resources::QuickLink < Avo::BaseResource
  include Avo::ResourceConcerns::ContentEnvelopeFields

  self.title = :title
  self.includes = [ { content_item: [ :author, :media_asset ] } ]
  self.authorization_policy = ContentRecordPolicy

  def fields
    field :id, as: :id
    content_envelope_fields
    field :link_url, as: :text, required: true
    field :icon, as: :text, help: "Icon name/class used by the quick-link tile."
  end

  def filters
    content_envelope_filters
  end

  def actions
    action Avo::Actions::PublishNow
  end
end
