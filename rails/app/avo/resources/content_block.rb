class Avo::Resources::ContentBlock < Avo::BaseResource
  include Avo::ResourceConcerns::ContentEnvelopeFields

  self.title = :title
  self.includes = [ { content_item: [ :author, :media_asset ] }, { rich_text_body: :embeds_attachments } ]
  self.authorization_policy = ContentRecordPolicy

  def fields
    field :id, as: :id
    content_envelope_fields
    field :body, as: :trix, always_show: true
    field :block_key, as: :text,
      help: "Optional stable key for a named singleton block (e.g. strategic_plan)."
  end

  def filters
    content_envelope_filters
  end

  def actions
    action Avo::Actions::PublishNow
  end
end
