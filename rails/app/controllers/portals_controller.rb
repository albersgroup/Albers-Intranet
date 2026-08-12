class PortalsController < ApplicationController
  # Public, server-rendered division portal. The page composition (which
  # sections, in what rows, with what defaults) comes from Portal::Layout —
  # a transcription of the old Node app's hand-assembled pages. Database
  # content overrides a section's defaults when present; otherwise the
  # section renders its default/empty state, exactly like Node did.
  layout "portal"

  def show
    @division = params[:division].presence_in(ContentItem::DIVISIONS) || "corporate"
    @layout = Portal::Layout.for(@division)

    items = ContentItem.for_division(@division).live.includes(:media_asset, :content_record).ordered
    @sections = items.group_by(&:section)
    @hero_override = @sections["hero"]&.find(&:hero_asset?)

    @results = ContentItem.for_division(@division).live.search(params[:q]).ordered if params[:q].present?
  end
end
