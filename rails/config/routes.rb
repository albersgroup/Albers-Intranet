Rails.application.routes.draw do
  mount_avo

  # Authentication
  get "login"  => "sessions#new",     as: :login
  delete "logout" => "sessions#destroy", as: :logout
  # OmniAuth (Entra ID) callback + failure
  match "auth/:provider/callback" => "sessions#create", via: [ :get, :post ]
  get   "auth/failure"            => "sessions#failure"
  # Dev-login bypass (guarded to non-production in the controller)
  post  "dev_login" => "sessions#dev_create", as: :dev_login

  # Public, server-rendered division portal driven by the content model.
  get "portal/:division" => "portals#show", as: :portal

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

  # Root: corporate portal.
  root "portals#show", defaults: { division: "corporate" }
end
