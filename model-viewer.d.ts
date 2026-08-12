mkdir -p src/types
cat > src/types/model-viewer.d.ts << 'EOF'
declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': any;
  }
}
EOF
