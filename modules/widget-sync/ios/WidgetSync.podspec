Pod::Spec.new do |s|
  s.name           = 'WidgetSync'
  s.version        = '1.0.0'
  s.summary        = 'Widget sync module for Reko'
  s.description    = 'Syncs data between React Native app and iOS widgets via App Group UserDefaults'
  s.author         = 'Reko'
  s.homepage       = 'https://github.com/example/widget-sync'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/example/widget-sync.git', :tag => "#{s.version}" }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.dependency 'React-Core'
end
