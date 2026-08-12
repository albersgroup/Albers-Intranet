class ContentItemPolicy < ApplicationPolicy
  # The Avo resource backed by ContentItem itself is now a read-only
  # cross-type overview (editing happens on each type's own resource via
  # ContentRecordPolicy) — index/show only, no create/update/destroy here.
  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.all if user&.admin?
      return scope.where(division: [ user.division, nil ]) if user&.division_admin?

      scope.live
    end
  end

  def index? = staff?
  def show?  = staff?

  private

  def staff?
    user&.admin? || user&.division_admin?
  end
end
