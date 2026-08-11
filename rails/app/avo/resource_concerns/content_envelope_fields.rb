# Shared field declarations for the nine concrete-type Avo resources (News,
# QuickLink, HeroAsset, ...). All these fields live on the associated
# ContentItem (see ContentRecord's delegation), not on the concrete model
# itself — factored out here so nine resource files don't each hand-duplicate
# the same placement/lifecycle fields.
#
# app/avo is autoloaded as its own Zeitwerk root namespaced under `Avo`
# (Avo::Engine#avo.autoload), so this file must live under
# Avo::ResourceConcerns to match its path.
module Avo::ResourceConcerns::ContentEnvelopeFields
  extend ActiveSupport::Concern

  def content_envelope_fields
    field :title, as: :text, required: true
    field :subtitle, as: :text
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

    field :image, as: :file, is_image: true, hide_on: [ :index ]
    field :media_asset, as: :belongs_to
    field :author, as: :belongs_to

    field :created_at, as: :date_time, only_on: [ :show ]
    field :updated_at, as: :date_time, only_on: [ :show ]
  end

  def content_envelope_filters
    filter Avo::Filters::ContentRecordDivisionFilter
    filter Avo::Filters::ContentRecordStatusFilter
  end
end
