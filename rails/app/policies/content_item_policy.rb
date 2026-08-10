class ContentItemPolicy < ApplicationPolicy
  # Admins manage everything; division admins manage only their own division's
  # content (plus org-wide items with no division); viewers get read-only.
  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.all if user&.admin?
      return scope.where(division: [ user.division, nil ]) if user&.division_admin?

      scope.live
    end
  end

  def index?  = staff?
  def show?   = staff?
  def create? = staff?
  def new?    = create?

  def update?
    return false unless staff?

    user.can_edit_division?(record.division)
  end

  def edit?    = update?
  def destroy? = update?

  private

  def staff?
    user&.admin? || user&.division_admin?
  end
end
