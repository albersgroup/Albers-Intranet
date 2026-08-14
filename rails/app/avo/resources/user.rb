class Avo::Resources::User < Avo::BaseResource
  self.title = :email
  self.search = {
    query: -> { query.where("email ILIKE ? OR name ILIKE ?", "%#{params[:q]}%", "%#{params[:q]}%") }
  }

  def fields
    field :id, as: :id
    field :email, as: :text, required: true
    field :name, as: :text
    # A select *field*'s options hash is {label => stored_value} — the inverse
    # of a SelectFilter's {stored_value => label} (see Avo::Filters::*). Using
    # index_with here instead of index_by renders options whose value is the
    # humanized label, so the form posts "Division admin" and the record fails
    # its `inclusion` validation ("Role is not included in the list").
    field :role, as: :select, options: User::ROLES.index_by(&:humanize), required: true
    field :division, as: :select,
      options: User::DIVISIONS.index_by(&:humanize),
      include_blank: "Org-wide"
    field :entra_oid, as: :text, readonly: true,
      help: "Set automatically on first Entra ID sign-in."
    field :created_at, as: :date_time, only_on: [ :show ]
  end
end
