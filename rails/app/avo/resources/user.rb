class Avo::Resources::User < Avo::BaseResource
  self.title = :email
  self.search = {
    query: -> { query.where("email ILIKE ? OR name ILIKE ?", "%#{params[:q]}%", "%#{params[:q]}%") }
  }

  def fields
    field :id, as: :id
    field :email, as: :text, required: true
    field :name, as: :text
    field :role, as: :select, options: User::ROLES.index_with(&:humanize), required: true
    field :division, as: :select,
      options: User::DIVISIONS.index_with(&:humanize),
      include_blank: "Org-wide"
    field :entra_oid, as: :text, readonly: true,
      help: "Set automatically on first Entra ID sign-in."
    field :created_at, as: :date_time, only_on: [ :show ]
  end
end
