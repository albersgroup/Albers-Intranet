class Avo::Resources::ContentItem < Avo::BaseResource
  self.title = :title
  self.includes = [ :author, :media_asset, rich_text_body: :embeds_attachments ]
  self.search = {
    query: -> { query.search(params[:q]) }
  }

  def fields
    field :id, as: :id
    field :title, as: :text, required: true
    field :subtitle, as: :text
    field :body, as: :trix, always_show: true

    field :content_type, as: :select,
      options: ContentItem::CONTENT_TYPES.index_with { |t| t.humanize },
      required: true
    field :division, as: :select,
      options: ContentItem::DIVISIONS.index_with(&:humanize),
      include_blank: "Org-wide (all portals)"
    field :section, as: :text, required: true,
      help: "Placement bucket on the portal, e.g. hero, news, quick_links, spotlights"
    field :position, as: :number

    field :status, as: :select,
      options: ContentItem::STATUSES.index_with(&:humanize),
      required: true
    field :publish_at, as: :date_time,
      help: "Required when status is Scheduled; the publish job flips it live at this time."

    field :link_url, as: :text
    field :external_ref, as: :text, hide_on: [ :index ]

    field :image, as: :file, is_image: true, hide_on: [ :index ]
    field :media_asset, as: :belongs_to
    field :author, as: :belongs_to

    field :live, as: :boolean, readonly: true, only_on: [ :index, :show ]
    field :created_at, as: :date_time, only_on: [ :show ]
    field :updated_at, as: :date_time, only_on: [ :show ]
  end

  def filters
    filter Avo::Filters::ContentDivisionFilter
    filter Avo::Filters::ContentStatusFilter
  end

  def actions
    action Avo::Actions::PublishNow
  end
end
