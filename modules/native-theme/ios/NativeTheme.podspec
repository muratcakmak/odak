Pod::Spec.new do |s|
  s.name           = 'NativeTheme'
  s.version        = '1.0.0'
  s.summary        = 'Runtime native theme control for Reko'
  s.description    = 'Allows React Native to update the iOS UIUserInterfaceStyle at runtime.'
  s.author         = 'Reko'
  s.homepage       = 'https://github.com/example/native-theme'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/example/native-theme.git', :tag => "#{s.version}" }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.dependency 'React-Core'
end


