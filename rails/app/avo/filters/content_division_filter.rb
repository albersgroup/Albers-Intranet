class Avo::Filters::ContentDivisionFilter < Avo::Filters::SelectFilter
  self.name = "Division"

  def apply(request, query, value)
    return query if value.blank?
    return query.where(division: nil) if value == "org_wide"

    query.where(division: value)
  end

  def options
    { "org_wide" => "Org-wide" }.merge(ContentItem::DIVISIONS.index_with(&:humanize))
  end
end
