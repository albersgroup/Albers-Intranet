class UserPolicy < ApplicationPolicy
  # User administration (role/division assignment) is org-admin only.
  class Scope < ApplicationPolicy::Scope
    def resolve
      user&.admin? ? scope.all : scope.none
    end
  end

  def index?   = user&.admin?
  def show?    = user&.admin?
  def create?  = user&.admin?
  def new?     = create?
  def update?  = user&.admin?
  def edit?    = update?
  def destroy? = user&.admin?
end
