# Entra ID (Azure AD) single sign-on via OpenID Connect.
#
# End-to-end this requires an Azure app registration plus tenant admin consent
# (an external dependency tracked in rails/README.md). Until those credentials
# are present, the provider is simply not registered and the dev-login bypass
# (SessionsController#dev_create, non-production only) is used instead — so the
# app is demonstrable before consent lands.
Rails.application.config.middleware.use OmniAuth::Builder do
  if ENV["AZURE_CLIENT_ID"].present? && ENV["AZURE_TENANT_ID"].present?
    tenant = ENV["AZURE_TENANT_ID"]

    provider :openid_connect,
             name: :entra_id,
             scope: [ :openid, :email, :profile ],
             response_type: :code,
             issuer: "https://login.microsoftonline.us/#{tenant}/v2.0",
             discovery: true,
             uid_field: "sub",
             client_options: {
               identifier: ENV["AZURE_CLIENT_ID"],
               secret: ENV["AZURE_CLIENT_SECRET"],
               redirect_uri: "#{ENV.fetch('APP_BASE_URL', 'http://localhost:3000')}/auth/entra_id/callback"
             }
  end
end

OmniAuth.config.allowed_request_methods = [ :post ]
OmniAuth.config.silence_get_warning = true
