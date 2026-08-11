# Same as ContentDivisionFilter, but for the nine concrete-type Avo resources
# (News, QuickLink, ...) whose model doesn't have a division column itself —
# it lives on the associated ContentItem.
class Avo::Filters::ContentRecordDivisionFilter < Avo::Filters::SelectFilter
  self.name = "Division"

  def apply(request, query, value)
    return query if value.blank?

    query = query.joins(:content_item)
    return query.where(content_items: { division: nil }) if value == "org_wide"

    query.where(content_items: { division: value })
  end

  def options
    { "org_wide" => "Org-wide" }.merge(ContentItem::DIVISIONS.index_with(&:humanize))
  end
end
