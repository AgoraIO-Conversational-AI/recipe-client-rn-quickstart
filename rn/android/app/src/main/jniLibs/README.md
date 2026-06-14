# Vendored `libaosl.so`

`libaosl.so` (Agora Object Stream Library) is an Agora SDK redistributable. Both
`react-native-agora` (RTC) and `agora-react-native-rtm` (RTM) bundle their own
copy, and the two versions differ — RTC 4.5.x references newer `aosl` symbols
(e.g. `aosl_mpq_set_named_oneshot_timer`) that the RTM 2.2.x copy lacks.

React Native autolinking sorts `agora-react-native-rtm` first, so the default
`pickFirsts += ["**/libaosl.so"]` packaging rule keeps the **older** (RTM) copy
and RTC then fails to `dlopen` at runtime:

```
java.lang.UnsatisfiedLinkError: dlopen failed: cannot locate symbol
"aosl_mpq_set_named_oneshot_timer" referenced by libagora-rtc-sdk.so
```

The newer copy here (extracted from `react-native-agora`'s RTC SDK) is a
superset that satisfies both RTC and RTM. Local module `jniLibs` sort first in
the merge, so `pickFirst` keeps this copy. See `app/build.gradle`.

These files are pinned to the SDK versions in `package.json`; if you bump
`react-native-agora`, refresh them from that package's RTC `aosl` jni libs.
