# Read-only cross-type overview — "what's scheduled to publish this week
# across every type" — not an editor. Editing happens on each type's own
# resource (Avo::Resources::News, ::QuickLink, ...), which only shows the
# fields relevant to that type. See docs/CONTENT_MODEL_SPLIT_PLAN.md.
class Avo::Resources::ContentItem < Avo::BaseResource
  self.title = :title
  self.includes = [ :author, :media_asset, :content_record ]
  self.search = {
    query: -> { query.search(params[:q]) }
  }

  def fields
    field :id, as: :id
    field :title, as: :text, readonly: true
    field :subtitle, as: :text, readonly: true
    field :content_record_type, as: :text, readonly: true, name: "Type"

    field :division, as: :select,
      options: ContentItem::DIVISIONS.index_with(&:humanize),
      readonly: true
    field :section, as: :text, readonly: true
    field :position, as: :number, readonly: true

    field :status, as: :select,
      options: ContentItem::STATUSES.index_with(&:humanize),
      readonly: true
    field :publish_at, as: :date_time, readonly: true

    field :media_asset, as: :belongs_to, readonly: true
    field :author, as: :belongs_to, readonly: true

    field :live, as: :boolean, readonly: true, only_on: [ :index, :show ]
    field :created_at, as: :date_time, only_on: [ :show ]
    field :updated_at, as: :date_time, only_on: [ :show ]
  end

  def filters
    filter Avo::Filters::ContentDivisionFilter
    filter Avo::Filters::ContentStatusFilter
  end
end
