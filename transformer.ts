import * as typescript from 'typescript'

const transformer = (_: typescript.Program) => (transformationContext: typescript.TransformationContext) => (sourceFile: typescript.SourceFile) => {
  function visitNode(node: typescript.Node): typescript.VisitResult<typescript.Node> {
    if (node && typescript.isSourceFile(node)) {
      const file = (node as typescript.Node) as typescript.SourceFile;

      if (file.fileName.endsWith('ts')) {
        const updatedSourceFile = typescript.factory.updateSourceFile(file, [
          typescript.factory.createVariableStatement(
            undefined,
            typescript.factory.createVariableDeclarationList([
              typescript.factory.createVariableDeclaration(
                'recapTracer',
                undefined,
                undefined,
                typescript.factory.createCallExpression(
                  typescript.factory.createIdentifier('require'),
                  [],
                  [typescript.factory.createStringLiteral('@recap.dev/client')]
                ),
              )
            ])
          ),
          ...file.statements
        ])

        return typescript.visitEachChild(updatedSourceFile, visitNode, transformationContext)
      }
    }

    if (node && typescript.isArrowFunction(node)) {
      const arrowFunction = node as typescript.ArrowFunction

      if (typescript.isVariableDeclaration(arrowFunction.parent)) {
        const variableDeclaration = arrowFunction.parent as typescript.VariableDeclaration
        const functionName = variableDeclaration.name.getText()

        return typescript.factory.createCallExpression(
          typescript.factory.createPropertyAccessExpression(
            typescript.factory.createIdentifier('recapTracer'),
            typescript.factory.createIdentifier('wrapFunction'),
          ),
          [],
          [
            typescript.factory.createStringLiteral(sourceFile.fileName),
            typescript.factory.createStringLiteral(functionName),
            typescript.visitEachChild(arrowFunction, visitNode, transformationContext),
          ]
        )
      }
    }

    if (node && typescript.isFunctionDeclaration(node)) {
      const functionNode = node as typescript.SignatureDeclaration
      const functionName = functionNode.name?.getText()

      if (functionName) {
        const variableAssignment = typescript.factory.createVariableDeclaration(
          functionName,
          undefined,
          undefined,
          typescript.factory.createCallExpression(
            typescript.factory.createPropertyAccessExpression(
              typescript.factory.createIdentifier('recapTracer'),
              typescript.factory.createIdentifier('wrapFunction'),
            ),
            [],
            [
              typescript.factory.createStringLiteral(sourceFile.fileName),
              typescript.factory.createStringLiteral(functionName),
              typescript.factory.createIdentifier(functionName)
            ]
          )
        )

        return [typescript.visitEachChild(node, visitNode, transformationContext), variableAssignment]
      }
    }

    if (node && typescript.isClassLike(node)) {
      const classNode = node as typescript.ClassDeclaration
      const className = classNode.name?.getFullText(sourceFile)

      if (className) {
        const wrapCall = typescript.factory.createCallExpression(
          typescript.factory.createPropertyAccessExpression(
            typescript.factory.createIdentifier('recapTracer'),
            typescript.factory.createIdentifier('wrapClass'),
          ),
          [],
          [
            typescript.factory.createStringLiteral(sourceFile.fileName),
            typescript.factory.createStringLiteral(className),
            typescript.factory.createIdentifier(className)
          ]
        )

        return [typescript.visitEachChild(node, visitNode, transformationContext), wrapCall]
      }
    }

    return typescript.visitEachChild(node, visitNode, transformationContext)
  }

  return typescript.visitNode(sourceFile, visitNode)
}

export default transformer
