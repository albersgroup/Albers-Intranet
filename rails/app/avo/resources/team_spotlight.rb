class Avo::Resources::TeamSpotlight < Avo::BaseResource
  include Avo::ResourceConcerns::ContentEnvelopeFields

  self.title = :title
  self.includes = [ { content_item: [ :author, :media_asset ] }, { rich_text_body: :embeds_attachments } ]
  self.authorization_policy = ContentRecordPolicy

  def fields
    field :id, as: :id
    content_envelope_fields
    field :body, as: :trix, always_show: true
    field :employee_name, as: :text
    field :employee_role, as: :text
    field :department, as: :text
    field :spotlight_type, as: :select,
      options: { "New Hire" => "New Hire", "Promotion" => "Promotion",
                 "Work Anniversary" => "Work Anniversary", "Achievement" => "Achievement" },
      include_blank: true,
      help: "Controls the badge and fallback icon on the portal spotlight."
  end

  def filters
    content_envelope_filters
  end

  def actions
    action Avo::Actions::PublishNow
  end
end
